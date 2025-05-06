/**
 * AutoGPT Protocol Implementation
 * 
 * Implements the AutoGPT protocol for recursive planning agents.
 * Focuses on breaking tasks into subtasks and executing them in sequence.
 */

import { 
  BaseProtocol, 
  ProtocolCapabilities, 
  ProtocolConfig, 
  ProtocolMetadata, 
  ProtocolExecutionOptions,
  ExecutionMode
} from './BaseProtocol';
import { AgentTool, AgentResponse } from '../agent';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../../vite';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Step type for AutoGPT execution
interface AutoGPTStep {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  output?: any;
  error?: string;
}

export class AutoGPTProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are an autonomous agent that can break down tasks into steps, plan, and execute them sequentially.',
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.RECURSIVE_PLANNING,
      ProtocolCapabilities.SELF_CORRECTION
    ],
    maxSteps: 10, // Maximum number of steps before forcing completion
    thoughtDepth: 2, // Depth of recursive reasoning
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private executionSteps: AutoGPTStep[] = [];
  private currentStepIndex: number = 0;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'AutoGPT',
      version: '1.0.0',
      description: 'Protocol for recursive planning agents (multi-step)',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.RECURSIVE_PLANNING,
        ProtocolCapabilities.SELF_CORRECTION
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
    }
    
    // Store available tools
    this.availableTools = this.config.tools || [];
    
    // Reset execution state
    this.executionSteps = [];
    this.currentStepIndex = 0;
    
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

      // Generate the initial plan
      await this.generatePlan(options.task, options);
      
      // Execute the plan step by step
      const executionResult = await this.executePlan(options);
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: executionResult.finalSummary,
        usedTools: executionResult.toolExecutions,
        thinking: executionResult.thinking,
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`AutoGPT Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Generate a plan for executing the task
   */
  private async generatePlan(task: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for planning
    const planningPrompt = `${this.config.systemPrompt}

You are a recursive planning agent that can break down complex tasks into simple, executable steps. Your job is to:

1. Analyze the given task 
2. Break it down into a sequence of 3-7 logical steps
3. Ensure each step is specific, actionable, and achievable
4. Consider dependencies between steps
5. Include any tool usage needed for each step

${this.getToolsInstructionsString()}

Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about how to approach this task",
  "plan": [
    {
      "name": "Step 1 name - should be short and descriptive",
      "description": "Detailed description of what this step will accomplish"
    },
    ...
  ]
}`;

    // Generate the plan
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: planningPrompt,
      messages: [{ role: 'user', content: `Task: ${task}` }]
    });
    
    // Parse the plan from the response
    const content = response.content[0].text;
    this.executionSteps = await this.parsePlanFromResponse(content);
    this.currentStepIndex = 0;
  }

  /**
   * Parse the plan from the LLM response
   */
  private async parsePlanFromResponse(content: string): Promise<AutoGPTStep[]> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON plan from response');
      }
      
      let planJson;
      try {
        planJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        planJson = JSON.parse(jsonMatch[1].trim());
      }
      
      if (!planJson || !Array.isArray(planJson.plan)) {
        throw new Error('Invalid plan format in response');
      }
      
      // Convert to AutoGPTStep format
      return planJson.plan.map((step: any, index: number) => ({
        id: index + 1,
        name: step.name || `Step ${index + 1}`,
        description: step.description || '',
        completed: false
      }));
    } catch (error) {
      log(`Error parsing plan from response: ${error}`, 'agent');
      // Create a default single-step plan as fallback
      return [{
        id: 1,
        name: 'Execute task',
        description: 'Execute the requested task directly',
        completed: false
      }];
    }
  }

  /**
   * Execute the generated plan
   */
  private async executePlan(options: ProtocolExecutionOptions): Promise<{
    finalSummary: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
    thinking: string;
  }> {
    const tools = options.tools || this.availableTools;
    const maxSteps = this.config.maxSteps as number;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    let thinking = '';
    
    // Execute each step in the plan
    while (this.currentStepIndex < this.executionSteps.length && this.currentStepIndex < maxSteps) {
      const currentStep = this.executionSteps[this.currentStepIndex];
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: currentStep.name,
          description: currentStep.description,
          status: 'started'
        });
      }
      
      // Execute the current step
      try {
        const stepResult = await this.executeStep(currentStep, options.task, this.getExecutionContext(), tools, options);
        
        // Update the step with the result
        currentStep.completed = true;
        currentStep.output = stepResult.output;
        
        // Append to thinking
        thinking += `Step ${currentStep.id}: ${currentStep.name}\n`;
        thinking += `Reasoning: ${stepResult.reasoning}\n`;
        thinking += `Output: ${JSON.stringify(stepResult.output)}\n\n`;
        
        // Add any tool executions
        if (stepResult.toolExecution) {
          toolExecutions.push(stepResult.toolExecution);
        }
        
        // Call onStep callback with completion
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: currentStep.name,
            description: currentStep.description,
            output: stepResult.output,
            status: 'completed'
          });
        }
      } catch (error) {
        // Handle step execution error
        currentStep.completed = false;
        currentStep.error = (error as Error).message;
        
        // Append to thinking
        thinking += `Step ${currentStep.id}: ${currentStep.name}\n`;
        thinking += `Error: ${currentStep.error}\n\n`;
        
        // Call onStep callback with failure
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: currentStep.name,
            description: currentStep.description,
            error: currentStep.error,
            status: 'failed'
          });
        }
        
        // Try to handle the error with self-correction if supported
        if (this.supportsCapability(ProtocolCapabilities.SELF_CORRECTION)) {
          const correctionResult = await this.attemptStepCorrection(currentStep, options.task, error as Error, tools, options);
          
          if (correctionResult.success) {
            // Update the step with the corrected result
            currentStep.completed = true;
            currentStep.output = correctionResult.output;
            currentStep.error = undefined;
            
            // Append correction to thinking
            thinking += `Self-correction attempt:\n`;
            thinking += `Reasoning: ${correctionResult.reasoning}\n`;
            thinking += `Corrected output: ${JSON.stringify(correctionResult.output)}\n\n`;
            
            // Add any tool executions from correction
            if (correctionResult.toolExecution) {
              toolExecutions.push(correctionResult.toolExecution);
            }
            
            // Call onStep callback with completion after correction
            if (options.callbacks?.onStep) {
              options.callbacks.onStep({
                name: currentStep.name,
                description: currentStep.description,
                output: correctionResult.output,
                status: 'completed'
              });
            }
          } else {
            // Correction failed, log and continue
            thinking += `Self-correction failed: ${correctionResult.error}\n\n`;
          }
        }
      }
      
      // Move to next step
      this.currentStepIndex++;
    }
    
    // Generate final summary
    const finalSummary = await this.generateSummary(options.task);
    
    return {
      finalSummary,
      toolExecutions,
      thinking
    };
  }

  /**
   * Execute a single step in the plan
   */
  private async executeStep(
    step: AutoGPTStep,
    task: string,
    context: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    reasoning: string;
    output: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for step execution
    const stepExecutionPrompt = `${this.config.systemPrompt}

You are currently executing a step in a multi-step plan to accomplish a task. Focus only on this step.

Current task: ${task}

Current step: ${step.name}
Step description: ${step.description}

Context from previous steps:
${JSON.stringify(context, null, 2)}

${this.getToolsInstructionsString()}

Think step by step about how to accomplish this specific step. Consider:
1. What information do you need?
2. What tools (if any) would help accomplish this step?
3. What is the expected output of this step?

Respond with a JSON object in the following format:
{
  "reasoning": "Your detailed reasoning about how to accomplish this step",
  "action": {
    "type": "tool_use" OR "direct_response",
    "tool": "tool_name" (if using a tool),
    "input": { ... tool parameters ... } (if using a tool),
    "response": "Your direct response" (if not using a tool)
  }
}`;

    // Execute the step
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: stepExecutionPrompt,
      messages: [{ 
        role: 'user', 
        content: `Execute step: ${step.name}`
      }]
    });
    
    // Parse the response
    const content = response.content[0].text;
    return await this.parseStepResponse(content, tools, options);
  }

  /**
   * Parse the step execution response
   */
  private async parseStepResponse(
    content: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    reasoning: string;
    output: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from step execution response');
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      }
      
      const reasoning = responseJson.reasoning || '';
      
      // Handle based on action type
      if (responseJson.action.type === 'tool_use' && responseJson.action.tool && responseJson.action.input) {
        const toolName = responseJson.action.tool;
        const toolInput = responseJson.action.input;
        
        // Find the tool
        const tool = tools.find(t => t.name === toolName);
        
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found`);
        }
        
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
        
        return {
          reasoning,
          output: result,
          toolExecution: {
            tool: toolName,
            input: toolInput,
            output: result
          }
        };
      } else {
        // Direct response
        return {
          reasoning,
          output: responseJson.action.response || ''
        };
      }
    } catch (error) {
      log(`Error parsing step response: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Attempt to correct a failed step
   */
  private async attemptStepCorrection(
    step: AutoGPTStep,
    task: string,
    error: Error,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    reasoning?: string;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
    error?: string;
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for step correction
    const correctionPrompt = `${this.config.systemPrompt}

You are attempting to correct a failed step in a multi-step plan.

Current task: ${task}

Failed step: ${step.name}
Step description: ${step.description}
Error: ${error.message}

Context from execution:
${JSON.stringify(this.getExecutionContext(), null, 2)}

${this.getToolsInstructionsString()}

Analyze the error carefully and determine how to fix the issue. Think of alternative approaches or parameter adjustments that could resolve the problem.

Respond with a JSON object in the following format:
{
  "reasoning": "Your analysis of what went wrong and how to fix it",
  "action": {
    "type": "tool_use" OR "direct_response",
    "tool": "tool_name" (if using a tool),
    "input": { ... tool parameters ... } (if using a tool),
    "response": "Your direct response" (if not using a tool)
  }
}`;

    try {
      // Execute the correction
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: correctionPrompt,
        messages: [{ 
          role: 'user', 
          content: `Correct the failed step: ${step.name}. Error: ${error.message}`
        }]
      });
      
      // Parse the response
      const content = response.content[0].text;
      const result = await this.parseStepResponse(content, tools, options);
      
      return {
        success: true,
        reasoning: result.reasoning,
        output: result.output,
        toolExecution: result.toolExecution
      };
    } catch (error) {
      log(`Error in step correction: ${error}`, 'agent');
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Generate a summary of the execution
   */
  private async generateSummary(task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for summary generation
    const summaryPrompt = `${this.config.systemPrompt}

You are generating a summary of a multi-step task execution. The summary should:
1. Describe what was accomplished
2. Highlight key results and findings
3. Be concise but comprehensive
4. Use a professional tone`;

    const completedSteps = this.executionSteps.filter(step => step.completed);
    const failedSteps = this.executionSteps.filter(step => !step.completed);
    
    const executionSummaryContent = `
Task: ${task}

Execution Summary:
- Total steps planned: ${this.executionSteps.length}
- Steps completed: ${completedSteps.length}
- Steps failed: ${failedSteps.length}

Completed steps:
${completedSteps.map(step => `- ${step.name}: ${JSON.stringify(step.output)}`).join('\n')}

${failedSteps.length > 0 ? `Failed steps:
${failedSteps.map(step => `- ${step.name}: ${step.error}`).join('\n')}` : ''}

Please generate a comprehensive summary of what was accomplished.
`;

    // Generate the summary
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5, // Lower temperature for more focused summary
      system: summaryPrompt,
      messages: [{ role: 'user', content: executionSummaryContent }]
    });
    
    return response.content[0].text;
  }

  /**
   * Get the current execution context
   */
  private getExecutionContext(): any {
    const completedSteps = this.executionSteps
      .filter(step => step.completed && step.id < this.currentStepIndex + 1)
      .map(step => ({
        id: step.id,
        name: step.name,
        output: step.output
      }));
    
    return {
      completedSteps,
      currentStepIndex: this.currentStepIndex,
      totalSteps: this.executionSteps.length
    };
  }

  /**
   * Get tools instructions string
   */
  private getToolsInstructionsString(): string {
    const tools = this.availableTools;
    
    if (tools.length === 0) {
      return '';
    }
    
    let toolsString = 'You have access to the following tools:\n';
    
    tools.forEach(tool => {
      toolsString += `- ${tool.name}: ${tool.description}\n`;
      toolsString += '  Parameters:\n';
      Object.entries(tool.parameters).forEach(([paramName, paramInfo]) => {
        toolsString += `    - ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}\n`;
      });
    });
    
    return toolsString;
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
    // Reset execution state
    this.executionSteps = [];
    this.currentStepIndex = 0;
    this.initialized = false;
    
    return Promise.resolve();
  }
}