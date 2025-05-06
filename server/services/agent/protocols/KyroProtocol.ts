/**
 * Kyro Protocol Implementation
 * 
 * Implements the Kyro protocol for lightweight serverless automation.
 * Focuses on efficient execution in serverless environments.
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

// Automation task types
enum AutomationTaskType {
  DATA_PROCESSING = 'data_processing',
  API_INTEGRATION = 'api_integration',
  WORKFLOW_AUTOMATION = 'workflow_automation',
  CONTENT_GENERATION = 'content_generation',
  NOTIFICATION = 'notification'
}

// Automation task
interface AutomationTask {
  id: string;
  type: AutomationTaskType;
  name: string;
  description: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
  startTime?: string;
  endTime?: string;
  executionTime?: number;
}

export class KyroProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Kyro, a lightweight serverless automation agent. You excel at:
1. Breaking down tasks into serverless-friendly operations
2. Efficient resource utilization in constrained environments
3. Handling asynchronous workflows with minimal state management
4. API integrations and data transformations
5. Self-contained task execution with minimal dependencies
6. Serverless-optimized error handling and retry strategies`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.SERVERLESS,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.MULTI_STEP
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Task state
  private tasks: AutomationTask[] = [];
  private currentTaskIndex: number = 0;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Kyro',
      version: '1.0.0',
      description: 'Lightweight serverless automation agent',
      capabilities: [
        ProtocolCapabilities.SERVERLESS,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.MULTI_STEP
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
    this.currentTaskIndex = 0;
    
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

      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Planning',
          description: 'Analyzing task and creating execution plan',
          status: 'started'
        });
      }

      // Step 1: Parse task and plan execution 
      await this.parseTasks(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Planning',
          description: `Created execution plan with ${this.tasks.length} tasks`,
          status: 'completed'
        });
      }
      
      // Step 2: Execute tasks
      await this.executeTasks(options);
      
      // Prepare the final response
      const finalResponse = this.generateExecutionSummary();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'kyro',
        metadata: {
          taskCount: this.tasks.length,
          completedTaskCount: this.tasks.filter(t => t.status === 'completed').length,
          failedTaskCount: this.tasks.filter(t => t.status === 'failed').length
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Kyro Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Parse the task and create execution plan
   */
  private async parseTasks(task: string, options: ProtocolExecutionOptions): Promise<void> {
    // Generate the planning prompt
    const planningPrompt = `As Kyro, a serverless automation agent, analyze the following task request and break it down into discrete, serverless-friendly tasks:

Task Request: ${task}

Create a plan with sequential tasks that can be executed in a serverless environment. Consider:
1. Breaking the process into small, stateless steps
2. Minimizing resource usage and execution time
3. Utilizing available tools effectively
4. Managing data between tasks efficiently
5. Error handling and recovery strategies

For each task, provide:
- Task type (data_processing, api_integration, workflow_automation, content_generation, notification)
- A descriptive name
- A detailed description of what the task does
- The required inputs

Respond with a JSON array of tasks in the following format:
[
  {
    "id": "task1",
    "type": "task_type",
    "name": "Task Name",
    "description": "Detailed description of what this task does",
    "inputs": {
      "param1": "value1",
      "param2": "value2"
    }
  },
  ...
]`;

    // Get response from the LLM
    const planningResponse = await this.getResponseFromLLM(planningPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = planningResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const tasks = JSON.parse(jsonMatch[0]);
        
        if (Array.isArray(tasks) && tasks.length > 0) {
          // Store the tasks with initial status
          this.tasks = tasks.map(task => ({
            ...task,
            status: 'pending'
          }));
          
          return;
        }
      }
      
      throw new Error('Could not parse tasks from planning response');
    } catch (error) {
      log(`Error parsing tasks: ${error}`, 'agent');
      
      // Create a default task plan
      const defaultTaskTypes = [
        AutomationTaskType.DATA_PROCESSING,
        AutomationTaskType.API_INTEGRATION,
        AutomationTaskType.CONTENT_GENERATION
      ];
      
      // Split the task by words to extract key components
      const words = task.split(/\s+/);
      const keywords = words.filter(word => word.length > 5);
      
      // Create default tasks
      this.tasks = [
        {
          id: 'task1',
          type: AutomationTaskType.DATA_PROCESSING,
          name: 'Process Input Data',
          description: `Process and validate the input data for ${keywords[0] || 'the task'}`,
          inputs: { raw_input: task },
          status: 'pending'
        },
        {
          id: 'task2',
          type: defaultTaskTypes[1],
          name: 'Execute Primary Operation',
          description: `Perform the main operation required for ${keywords[0] || 'the task'}`,
          inputs: { processed_data: 'from_task1' },
          status: 'pending'
        },
        {
          id: 'task3',
          type: defaultTaskTypes[2],
          name: 'Generate Result',
          description: 'Format and prepare the final result',
          inputs: { operation_result: 'from_task2' },
          status: 'pending'
        }
      ];
    }
  }

  /**
   * Execute the planned tasks
   */
  private async executeTasks(options: ProtocolExecutionOptions): Promise<void> {
    // Execute tasks sequentially (important for serverless environments)
    for (let i = 0; i < this.tasks.length; i++) {
      this.currentTaskIndex = i;
      const task = this.tasks[i];
      
      // Skip tasks that are already completed or failed
      if (task.status !== 'pending') continue;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task ${i + 1}: ${task.name}`,
          description: task.description,
          status: 'started'
        });
      }
      
      // Update task status and start time
      task.status = 'in-progress';
      task.startTime = new Date().toISOString();
      
      try {
        // Execute the task
        const result = await this.executeTask(task, options);
        
        // Update task with results
        task.status = 'completed';
        task.outputs = result;
        task.endTime = new Date().toISOString();
        task.executionTime = new Date(task.endTime).getTime() - new Date(task.startTime).getTime();
        
        // Update subsequent task inputs with outputs from this task
        this.updateDependentTaskInputs(i, result);
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task ${i + 1}: ${task.name}`,
            description: task.description,
            output: result,
            status: 'completed'
          });
        }
      } catch (error) {
        // Handle task failure
        task.status = 'failed';
        task.error = (error as Error).message;
        task.endTime = new Date().toISOString();
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task ${i + 1}: ${task.name}`,
            description: task.description,
            error: (error as Error).message,
            status: 'failed'
          });
        }
        
        // In serverless environments, we typically continue with the next task
        // rather than failing the entire process
        log(`Task execution error (continuing): ${error}`, 'agent');
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: AutomationTask, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    // Check if task requires a tool
    const requiredTool = this.findAppropriateToolForTask(task);
    
    if (requiredTool) {
      // Execute task using the tool
      return await this.executeTaskWithTool(task, requiredTool, options);
    } else {
      // Execute task using the LLM
      return await this.executeTaskWithLLM(task, options);
    }
  }

  /**
   * Find an appropriate tool for a task
   */
  private findAppropriateToolForTask(task: AutomationTask): AgentTool | null {
    const tools = this.availableTools;
    if (tools.length === 0) {
      return null;
    }
    
    // Look for tools that match the task type
    let matchingTools: AgentTool[] = [];
    
    switch (task.type) {
      case AutomationTaskType.DATA_PROCESSING:
        matchingTools = tools.filter(tool => 
          tool.name.includes('data') || 
          tool.name.includes('process') || 
          tool.name.includes('transform')
        );
        break;
      case AutomationTaskType.API_INTEGRATION:
        matchingTools = tools.filter(tool => 
          tool.name.includes('api') || 
          tool.name.includes('request') || 
          tool.name.includes('http')
        );
        break;
      case AutomationTaskType.WORKFLOW_AUTOMATION:
        matchingTools = tools.filter(tool => 
          tool.name.includes('workflow') || 
          tool.name.includes('automate') || 
          tool.name.includes('schedule')
        );
        break;
      case AutomationTaskType.CONTENT_GENERATION:
        matchingTools = tools.filter(tool => 
          tool.name.includes('content') || 
          tool.name.includes('generate') || 
          tool.name.includes('create')
        );
        break;
      case AutomationTaskType.NOTIFICATION:
        matchingTools = tools.filter(tool => 
          tool.name.includes('notify') || 
          tool.name.includes('alert') || 
          tool.name.includes('email') ||
          tool.name.includes('message')
        );
        break;
    }
    
    // If no matches by type, look for matching keywords in the task description
    if (matchingTools.length === 0) {
      const taskWords = task.description.toLowerCase().split(/\s+/);
      
      for (const tool of tools) {
        const toolWords = tool.name.toLowerCase().split(/[_-]/);
        
        // Check if any keywords match
        for (const toolWord of toolWords) {
          if (taskWords.includes(toolWord) && toolWord.length > 3) {
            matchingTools.push(tool);
            break;
          }
        }
      }
    }
    
    // Return the first matching tool, or null if none found
    return matchingTools.length > 0 ? matchingTools[0] : null;
  }

  /**
   * Execute a task using a tool
   */
  private async executeTaskWithTool(task: AutomationTask, tool: AgentTool, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    // Prepare input parameters for the tool
    const toolInputs = await this.prepareToolInputs(task, tool, options);
    
    try {
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolInputs,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      const toolResult = await tool.execute(toolInputs);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolInputs,
          output: toolResult,
          error: undefined
        });
      }
      
      // Convert the result to a structured object if it's not already
      const structuredResult = typeof toolResult === 'object' ? 
        toolResult : 
        { result: toolResult };
      
      return structuredResult;
    } catch (error) {
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolInputs,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      throw error;
    }
  }

  /**
   * Prepare inputs for tool execution
   */
  private async prepareToolInputs(task: AutomationTask, tool: AgentTool, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    // Start with the task inputs
    const baseInputs = { ...task.inputs };
    
    // Check if we need to map task inputs to tool parameters
    const requiredToolParams = Object.entries(tool.parameters)
      .filter(([_, paramInfo]) => paramInfo.required)
      .map(([paramName, _]) => paramName);
    
    // If we're missing required parameters, use the LLM to create them
    const missingParams = requiredToolParams.filter(param => !baseInputs[param]);
    
    if (missingParams.length > 0) {
      // Generate the parameter mapping prompt
      const paramPrompt = `As Kyro, map the following task to the required parameters for the "${tool.name}" tool:

Task: ${task.description}
Task Inputs: ${JSON.stringify(baseInputs)}

The tool "${tool.name}" requires the following parameters:
${requiredToolParams.map(param => `- ${param}: ${tool.parameters[param].description}`).join('\n')}

Based on the task description and inputs, create values for these parameters.
Respond with a JSON object mapping the parameters:
{
  ${missingParams.map(param => `"${param}": "value"`).join(',\n  ')}
}`;

      // Get response from the LLM
      const paramResponse = await this.getResponseFromLLM(paramPrompt);
      
      try {
        // Extract JSON from the response
        const jsonMatch = paramResponse.match(/{[\s\S]*?}/);
        if (jsonMatch) {
          const paramMap = JSON.parse(jsonMatch[0]);
          
          // Merge the parameter map with the base inputs
          return { ...baseInputs, ...paramMap };
        }
      } catch (error) {
        log(`Error parsing parameter mapping: ${error}`, 'agent');
      }
    }
    
    return baseInputs;
  }

  /**
   * Execute a task using the LLM
   */
  private async executeTaskWithLLM(task: AutomationTask, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    // Generate the task execution prompt
    const taskPrompt = `As Kyro, execute the following serverless task:

Task: ${task.name}
Description: ${task.description}
Type: ${task.type}
Inputs: ${JSON.stringify(task.inputs)}

Execute this task and provide the results. Format your response as JSON with appropriate output fields based on the task type.
For a ${task.type} task, your output should include: 
${this.getExpectedOutputFieldsForTaskType(task.type)}

Respond with a JSON object containing your results:
{
  "key1": "value1",
  "key2": "value2",
  ...
}`;

    // Get response from the LLM
    const taskResponse = await this.getResponseFromLLM(taskPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = taskResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return the raw response
      return { result: taskResponse.trim() };
    } catch (error) {
      log(`Error parsing task result: ${error}`, 'agent');
      return { result: taskResponse.trim() };
    }
  }

  /**
   * Get expected output fields for a task type
   */
  private getExpectedOutputFieldsForTaskType(taskType: AutomationTaskType): string {
    switch (taskType) {
      case AutomationTaskType.DATA_PROCESSING:
        return 'processed_data, validation_results, statistics';
      case AutomationTaskType.API_INTEGRATION:
        return 'response_data, status_code, headers';
      case AutomationTaskType.WORKFLOW_AUTOMATION:
        return 'workflow_status, next_steps, trigger_results';
      case AutomationTaskType.CONTENT_GENERATION:
        return 'content, metadata, format_info';
      case AutomationTaskType.NOTIFICATION:
        return 'notification_status, recipients, delivery_time';
      default:
        return 'result, status, metadata';
    }
  }

  /**
   * Update dependent task inputs with outputs from completed tasks
   */
  private updateDependentTaskInputs(completedTaskIndex: number, result: Record<string, any>): void {
    const completedTask = this.tasks[completedTaskIndex];
    
    // Look for references to this task in subsequent tasks
    for (let i = completedTaskIndex + 1; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      
      // Check each input value for a reference to the completed task
      Object.entries(task.inputs).forEach(([key, value]) => {
        if (typeof value === 'string') {
          // Check for references like "from_task1" or "task1.output"
          if (value === `from_${completedTask.id}` || value === `${completedTask.id}`) {
            // Replace with the entire result object
            task.inputs[key] = result;
          } else if (value.startsWith(`${completedTask.id}.`)) {
            // Extract the specific field
            const field = value.split('.')[1];
            if (result[field] !== undefined) {
              task.inputs[key] = result[field];
            }
          }
        }
      });
    }
  }

  /**
   * Generate execution summary
   */
  private generateExecutionSummary(): string {
    let summary = `# Kyro Serverless Execution Summary\n\n`;
    
    // Task statistics
    const completedTasks = this.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.tasks.filter(t => t.status === 'failed');
    
    summary += `## Execution Statistics\n`;
    summary += `- Total Tasks: ${this.tasks.length}\n`;
    summary += `- Completed: ${completedTasks.length}\n`;
    summary += `- Failed: ${failedTasks.length}\n\n`;
    
    // Calculate total execution time
    const totalExecutionTime = completedTasks.reduce((total, task) => total + (task.executionTime || 0), 0);
    summary += `- Total Execution Time: ${totalExecutionTime}ms\n\n`;
    
    // Task details
    summary += `## Task Execution Details\n\n`;
    
    this.tasks.forEach((task, index) => {
      summary += `### ${index + 1}. ${task.name} (${task.id})\n`;
      summary += `**Type:** ${task.type}\n`;
      summary += `**Status:** ${task.status}\n`;
      summary += `**Description:** ${task.description}\n`;
      
      if (task.executionTime) {
        summary += `**Execution Time:** ${task.executionTime}ms\n`;
      }
      
      summary += `**Inputs:**\n\`\`\`json\n${JSON.stringify(task.inputs, null, 2)}\n\`\`\`\n`;
      
      if (task.outputs) {
        summary += `**Outputs:**\n\`\`\`json\n${JSON.stringify(task.outputs, null, 2)}\n\`\`\`\n`;
      }
      
      if (task.error) {
        summary += `**Error:** ${task.error}\n`;
      }
      
      summary += `\n`;
    });
    
    // Final results section
    if (completedTasks.length === this.tasks.length) {
      summary += `## Final Results\n`;
      
      // Get the outputs of the last completed task
      const finalTask = this.tasks[this.tasks.length - 1];
      if (finalTask.outputs) {
        summary += `\`\`\`json\n${JSON.stringify(finalTask.outputs, null, 2)}\n\`\`\`\n`;
      }
    } else if (failedTasks.length > 0) {
      summary += `## Execution Incomplete\n`;
      summary += `The automation workflow encountered ${failedTasks.length} error(s) during execution.\n`;
      
      // List errors
      summary += `\n**Errors:**\n`;
      failedTasks.forEach(task => {
        summary += `- ${task.name}: ${task.error}\n`;
      });
    }
    
    return summary;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // In a real implementation, we would track tool calls during execution
    // This would be populated during the executeTaskWithTool method
    return undefined;
  }

  /**
   * Get response from the appropriate LLM based on model name
   */
  private async getResponseFromLLM(prompt: string): Promise<string> {
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
      log(`Error getting LLM response: ${error}`, 'agent');
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
    this.currentTaskIndex = 0;
    this.initialized = false;
    
    return Promise.resolve();
  }
}