/**
 * Archon Protocol Implementation
 * 
 * Implements the Archon protocol for self-healing, error-correcting agent frameworks.
 * Focuses on resilience, recovery, and adaptation to failures.
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

// Error correction strategy type
export enum ErrorCorrectionStrategy {
  RETRY = 'retry',             // Simple retry of failed step
  RETHINK = 'rethink',         // Rethink the approach for the step
  DECOMPOSE = 'decompose',     // Break step into smaller sub-steps
  TOOL_SWITCH = 'tool_switch', // Switch to a different tool
  DELEGATE = 'delegate',       // Delegate to another agent or service
  ADAPT = 'adapt'              // Adapt parameters or approach
}

// Error type categories
export enum ErrorType {
  TOOL_ERROR = 'tool_error',           // Error in tool execution
  KNOWLEDGE_GAP = 'knowledge_gap',     // Missing information
  REASONING_ERROR = 'reasoning_error', // Logical error in reasoning
  API_ERROR = 'api_error',             // External API issue
  PERMISSION_ERROR = 'permission_error', // Permission or access issue
  DATA_ERROR = 'data_error',           // Data formatting or quality issue
  SYSTEM_ERROR = 'system_error',       // Underlying system error
  UNKNOWN = 'unknown'                  // Unclassified error
}

// Execution step interface
interface ExecutionStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'recovered';
  tool?: string;
  input?: Record<string, any>;
  output?: any;
  error?: {
    type: ErrorType;
    message: string;
    details?: any;
  };
  recovery?: {
    strategy: ErrorCorrectionStrategy;
    attempts: number;
    success: boolean;
    notes: string;
  };
  startTime?: Date;
  endTime?: Date;
  dependencies?: string[]; // IDs of steps this depends on
}

// Error handling rule
interface ErrorHandlingRule {
  errorType: ErrorType | 'any';
  toolName?: string; // Specific tool this rule applies to
  strategy: ErrorCorrectionStrategy;
  maxAttempts: number;
  description: string;
}

export class ArchonProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are a self-healing agent that can detect, diagnose, and recover from errors during task execution.',
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.SELF_CORRECTION
    ],
    maxRecoveryAttempts: 3, // Maximum number of recovery attempts per step
    errorRules: [
      {
        errorType: 'tool_error',
        strategy: ErrorCorrectionStrategy.RETRY,
        maxAttempts: 2,
        description: 'Retry tool execution with same parameters'
      },
      {
        errorType: 'tool_error',
        strategy: ErrorCorrectionStrategy.ADAPT,
        maxAttempts: 2,
        description: 'Adapt tool parameters and retry'
      },
      {
        errorType: 'knowledge_gap',
        strategy: ErrorCorrectionStrategy.RETHINK,
        maxAttempts: 1,
        description: 'Rethink approach with available information'
      },
      {
        errorType: 'reasoning_error',
        strategy: ErrorCorrectionStrategy.DECOMPOSE,
        maxAttempts: 2,
        description: 'Break down into smaller steps and solve incrementally'
      },
      {
        errorType: 'any',
        strategy: ErrorCorrectionStrategy.TOOL_SWITCH,
        maxAttempts: 1,
        description: 'Try an alternative tool'
      }
    ] as ErrorHandlingRule[],
    timeoutMs: 60000, // Timeout for the entire execution (1 minute)
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  private executionSteps: ExecutionStep[] = [];
  private currentStepIndex: number = 0;
  private errorLogs: Array<{
    timestamp: Date;
    step: string;
    error: any;
    recovery?: {
      strategy: ErrorCorrectionStrategy;
      success: boolean;
    };
  }> = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Archon',
      version: '1.0.0',
      description: 'Protocol for self-healing, error-correcting agent framework',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.TOOL_USE,
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
    this.errorLogs = [];
    
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
    const timeoutMs = this.config.timeoutMs as number;
    
    try {
      // Call onStart callback if provided
      if (options.callbacks?.onStart) {
        options.callbacks.onStart();
      }

      // Generate plan
      await this.generatePlan(options.task, options);
      
      // Execute plan with error recovery
      const executionResult = await this.executePlanWithRecovery(options, startTime, timeoutMs);
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: executionResult.finalSummary,
        usedTools: executionResult.toolExecutions,
        thinking: this.getExecutionSummary(),
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Archon Protocol execution error: ${error}`, 'agent');
      
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

    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Plan Generation',
        description: 'Generating execution plan with error recovery',
        status: 'started'
      });
    }

    // Prepare system prompt for planning
    const planningPrompt = `${this.config.systemPrompt}

You are a self-healing agent that specializes in robust task execution with error recovery. Your job is to:

1. Break down a task into logical steps
2. For each step, consider potential errors that might occur
3. Define error recovery strategies for each step
4. Organize steps in a sequence that allows for the most robust execution

${this.getToolsInstructionsString()}

For the given task, create a plan with 3-7 well-defined steps. For each step:
- Provide a clear name and description
- Identify which tool (if any) should be used
- Define the expected inputs and outputs
- Consider dependencies between steps

Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about the task and potential challenges",
  "steps": [
    {
      "id": "step_1",
      "name": "Short step name",
      "description": "Detailed step description",
      "tool": "tool_name" (if applicable),
      "input": { param1: "value1", ... } (if applicable),
      "dependencies": [] (IDs of steps this depends on)
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
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Plan Generation',
        description: 'Generated execution plan with error recovery',
        output: this.executionSteps.map(step => step.name).join(', '),
        status: 'completed'
      });
    }
  }

  /**
   * Parse the plan from the LLM response
   */
  private async parsePlanFromResponse(content: string): Promise<ExecutionStep[]> {
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
      
      if (!planJson || !Array.isArray(planJson.steps)) {
        throw new Error('Invalid plan format in response');
      }
      
      // Convert to ExecutionStep format
      return planJson.steps.map((step: any) => ({
        id: step.id || `step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: step.name || 'Unnamed Step',
        description: step.description || '',
        status: 'pending',
        tool: step.tool,
        input: step.input,
        dependencies: step.dependencies || []
      }));
    } catch (error) {
      log(`Error parsing plan from response: ${error}`, 'agent');
      
      // Create a default step as fallback
      return [{
        id: `step_${Date.now()}`,
        name: 'Execute Task',
        description: 'Execute the requested task directly',
        status: 'pending'
      }];
    }
  }

  /**
   * Execute the plan with error recovery
   */
  private async executePlanWithRecovery(
    options: ProtocolExecutionOptions,
    startTime: number,
    timeoutMs: number
  ): Promise<{
    finalSummary: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    const tools = options.tools || this.availableTools;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Execute steps in order, considering dependencies
    while (this.hasRemainingSteps()) {
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Execution timed out after ${timeoutMs}ms`);
      }
      
      // Get the next executable step
      const nextStep = this.getNextExecutableStep();
      
      if (!nextStep) {
        // No executable steps remain (possibly due to dependency issues)
        break;
      }
      
      // Update step status
      nextStep.status = 'in_progress';
      nextStep.startTime = new Date();
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: nextStep.name,
          description: nextStep.description,
          status: 'started'
        });
      }
      
      try {
        // Execute the step
        const stepResult = await this.executeStep(nextStep, options.task, tools, options);
        
        // Update step with result
        nextStep.status = 'completed';
        nextStep.output = stepResult.output;
        nextStep.endTime = new Date();
        
        // Add tool execution if applicable
        if (stepResult.toolExecution) {
          toolExecutions.push(stepResult.toolExecution);
        }
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: nextStep.name,
            description: nextStep.description,
            output: typeof stepResult.output === 'object' ? JSON.stringify(stepResult.output) : String(stepResult.output),
            status: 'completed'
          });
        }
      } catch (error) {
        // Handle step execution error
        const errorMessage = (error as Error).message;
        
        // Classify error type
        const errorType = this.classifyError(error);
        
        // Log the error
        nextStep.status = 'failed';
        nextStep.error = {
          type: errorType,
          message: errorMessage,
          details: error
        };
        
        this.errorLogs.push({
          timestamp: new Date(),
          step: nextStep.id,
          error
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: nextStep.name,
            description: nextStep.description,
            error: errorMessage,
            status: 'failed'
          });
        }
        
        // Attempt recovery
        const recoveryResult = await this.attemptRecovery(nextStep, options.task, error, tools, options);
        
        if (recoveryResult.success) {
          // Recovery succeeded
          nextStep.status = 'recovered';
          nextStep.output = recoveryResult.output;
          nextStep.recovery = {
            strategy: recoveryResult.strategy,
            attempts: recoveryResult.attempts,
            success: true,
            notes: recoveryResult.notes
          };
          nextStep.endTime = new Date();
          
          // Add tool execution if applicable
          if (recoveryResult.toolExecution) {
            toolExecutions.push(recoveryResult.toolExecution);
          }
          
          // Log the recovery
          this.errorLogs[this.errorLogs.length - 1].recovery = {
            strategy: recoveryResult.strategy,
            success: true
          };
          
          // Call onStep callback if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: `${nextStep.name} (Recovered)`,
              description: `${nextStep.description} - Recovery succeeded using ${recoveryResult.strategy}`,
              output: typeof recoveryResult.output === 'object' ? JSON.stringify(recoveryResult.output) : String(recoveryResult.output),
              status: 'completed'
            });
          }
        } else {
          // Recovery failed
          nextStep.recovery = {
            strategy: recoveryResult.strategy,
            attempts: recoveryResult.attempts,
            success: false,
            notes: recoveryResult.notes
          };
          nextStep.endTime = new Date();
          
          // Log the failed recovery
          this.errorLogs[this.errorLogs.length - 1].recovery = {
            strategy: recoveryResult.strategy,
            success: false
          };
          
          // Call onStep callback if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: `${nextStep.name} (Recovery Failed)`,
              description: `${nextStep.description} - Recovery failed after ${recoveryResult.attempts} attempts`,
              error: recoveryResult.notes,
              status: 'failed'
            });
          }
        }
      }
      
      // Move to next step
      this.currentStepIndex++;
    }
    
    // Generate final summary
    const finalSummary = await this.generateExecutionSummary(options.task);
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Execution Summary',
        description: 'Generated summary of execution with error recovery',
        output: finalSummary,
        status: 'completed'
      });
    }
    
    return {
      finalSummary,
      toolExecutions
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: ExecutionStep,
    task: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    output: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // If the step specifies a tool, use it
    if (step.tool && step.input) {
      const tool = tools.find(t => t.name === step.tool);
      
      if (!tool) {
        throw new Error(`Tool '${step.tool}' specified in step '${step.name}' not found`);
      }
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: step.tool,
          input: step.input,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      try {
        const result = await tool.execute(step.input);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: step.tool,
            input: step.input,
            output: result,
            error: undefined
          });
        }
        
        return {
          output: result,
          toolExecution: {
            tool: step.tool,
            input: step.input,
            output: result
          }
        };
      } catch (error) {
        // Update the tool use callback with the error
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: step.tool,
            input: step.input,
            output: undefined,
            error: (error as Error).message
          });
        }
        
        throw error;
      }
    }
    
    // If no tool is specified, use LLM to generate a response for this step
    const context = this.getStepContext(step.id);
    
    // Prepare system prompt for step execution
    const stepPrompt = `${this.config.systemPrompt}

You are executing a specific step in a task execution plan with error recovery.

Task: ${task}

Current step: ${step.name}
Description: ${step.description}

Context from previously completed steps:
${JSON.stringify(context, null, 2)}

Your goal is to complete this specific step successfully. Provide a clear, concise response that represents the output of this step.

Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about how to complete this step",
  "output": "The output of this step"
}`;

    // Execute the step with LLM
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: stepPrompt,
      messages: [{ role: 'user', content: `Execute step: ${step.name}` }]
    });
    
    // Parse the response
    const content = response.content[0].text;
    
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return { output: content };
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      }
      
      return { output: responseJson.output || content };
    } catch (error) {
      // If we can't parse the JSON, return the raw content
      return { output: content };
    }
  }

  /**
   * Attempt to recover from an error
   */
  private async attemptRecovery(
    step: ExecutionStep,
    task: string,
    error: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    strategy: ErrorCorrectionStrategy;
    attempts: number;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
    notes: string;
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Determine error type
    const errorType = step.error?.type || this.classifyError(error);
    
    // Get applicable error rules
    const rules = this.getErrorRules(errorType, step.tool);
    const maxAttempts = this.config.maxRecoveryAttempts as number;
    
    // Try each applicable strategy
    for (const rule of rules) {
      const strategy = rule.strategy;
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Recovery: ${step.name}`,
          description: `Attempting recovery with strategy: ${strategy}`,
          status: 'started'
        });
      }
      
      // Based on strategy, attempt recovery
      try {
        switch (strategy) {
          case ErrorCorrectionStrategy.RETRY:
            // Simple retry with same parameters
            if (!step.tool || !step.input) {
              continue; // Skip to next strategy if no tool or input
            }
            
            const retryResult = await this.retryWithSameParameters(step, tools, options);
            
            if (retryResult.success) {
              return {
                success: true,
                strategy,
                attempts: 1,
                output: retryResult.output,
                toolExecution: retryResult.toolExecution,
                notes: 'Retry with same parameters succeeded'
              };
            }
            break;
            
          case ErrorCorrectionStrategy.ADAPT:
            // Adapt parameters and retry
            if (!step.tool || !step.input) {
              continue; // Skip to next strategy if no tool or input
            }
            
            const adaptResult = await this.adaptParameters(step, task, error, tools, options);
            
            if (adaptResult.success) {
              return {
                success: true,
                strategy,
                attempts: adaptResult.attempts,
                output: adaptResult.output,
                toolExecution: adaptResult.toolExecution,
                notes: `Parameter adaptation succeeded after ${adaptResult.attempts} attempts`
              };
            }
            break;
            
          case ErrorCorrectionStrategy.RETHINK:
            // Rethink the approach
            const rethinkResult = await this.rethinkApproach(step, task, error, tools, options);
            
            if (rethinkResult.success) {
              return {
                success: true,
                strategy,
                attempts: 1,
                output: rethinkResult.output,
                toolExecution: rethinkResult.toolExecution,
                notes: 'Approach rethinking succeeded'
              };
            }
            break;
            
          case ErrorCorrectionStrategy.DECOMPOSE:
            // Decompose into sub-steps
            const decomposeResult = await this.decomposeProblem(step, task, error, tools, options);
            
            if (decomposeResult.success) {
              return {
                success: true,
                strategy,
                attempts: decomposeResult.subSteps.length,
                output: decomposeResult.output,
                notes: `Problem decomposition succeeded with ${decomposeResult.subSteps.length} sub-steps`
              };
            }
            break;
            
          case ErrorCorrectionStrategy.TOOL_SWITCH:
            // Switch to a different tool
            if (tools.length <= 1) {
              continue; // Skip if there are no alternative tools
            }
            
            const toolSwitchResult = await this.switchTool(step, task, error, tools, options);
            
            if (toolSwitchResult.success) {
              return {
                success: true,
                strategy,
                attempts: 1,
                output: toolSwitchResult.output,
                toolExecution: toolSwitchResult.toolExecution,
                notes: `Switched to tool: ${toolSwitchResult.toolExecution.tool}`
              };
            }
            break;
            
          case ErrorCorrectionStrategy.DELEGATE:
            // Not implemented in this version
            break;
            
          default:
            // Unsupported strategy
            continue;
        }
      } catch (recoveryError) {
        log(`Error in recovery strategy ${strategy}: ${recoveryError}`, 'agent');
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Recovery: ${step.name}`,
            description: `Recovery attempt with strategy ${strategy} failed`,
            error: (recoveryError as Error).message,
            status: 'failed'
          });
        }
        
        // Continue to next strategy
      }
    }
    
    // If we reach here, all recovery strategies failed
    return {
      success: false,
      strategy: rules.length > 0 ? rules[0].strategy : ErrorCorrectionStrategy.RETRY,
      attempts: rules.length,
      notes: `All ${rules.length} recovery strategies failed`
    };
  }

  /**
   * Retry with the same parameters
   */
  private async retryWithSameParameters(
    step: ExecutionStep,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!step.tool || !step.input) {
      return { success: false };
    }
    
    const tool = tools.find(t => t.name === step.tool);
    
    if (!tool) {
      return { success: false };
    }
    
    try {
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: step.tool,
          input: step.input,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      const result = await tool.execute(step.input);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: step.tool,
          input: step.input,
          output: result,
          error: undefined
        });
      }
      
      return {
        success: true,
        output: result,
        toolExecution: {
          tool: step.tool,
          input: step.input,
          output: result
        }
      };
    } catch (error) {
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: step.tool,
          input: step.input,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      return { success: false };
    }
  }

  /**
   * Adapt parameters and retry
   */
  private async adaptParameters(
    step: ExecutionStep,
    task: string,
    error: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    attempts: number;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient || !step.tool || !step.input) {
      return { success: false, attempts: 0 };
    }
    
    const tool = tools.find(t => t.name === step.tool);
    
    if (!tool) {
      return { success: false, attempts: 0 };
    }
    
    const maxAttempts = 2;
    let attempts = 0;
    
    // Prepare system prompt for parameter adaptation
    const adaptPrompt = `${this.config.systemPrompt}

You are adapting parameters for a failed tool execution to recover from an error. Your goal is to analyze the error and modify the parameters to make the tool execution succeed.

Task: ${task}

Step: ${step.name}
Description: ${step.description}

Tool: ${step.tool}
Tool description: ${tool.description}
Tool parameters:
${Object.entries(tool.parameters).map(([paramName, paramInfo]) => {
  return `- ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}`;
}).join('\n')}

Original parameters:
${JSON.stringify(step.input, null, 2)}

Error:
${(error as Error).message}

Analyze the error carefully and determine how to modify the parameters to fix the issue. Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about what went wrong and how to fix it",
  "adaptedParameters": { ... modified parameters ... }
}`;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Generate adapted parameters
        const response = await this.anthropicClient.messages.create({
          model: this.config.modelName as string,
          max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: adaptPrompt,
          messages: [{ 
            role: 'user', 
            content: `Adapt parameters for failed tool execution. Attempt ${attempts}/${maxAttempts}.`
          }]
        });
        
        // Parse the response
        const content = response.content[0].text;
        
        // Extract JSON from the response
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
        
        if (!jsonMatch) {
          continue; // Skip to next attempt if can't parse
        }
        
        let adaptedParams;
        try {
          adaptedParams = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, '')).adaptedParameters;
        } catch (e) {
          try {
            adaptedParams = JSON.parse(jsonMatch[1].trim()).adaptedParameters;
          } catch (e2) {
            continue; // Skip to next attempt if can't parse
          }
        }
        
        if (!adaptedParams) {
          continue; // Skip to next attempt if no adapted parameters
        }
        
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: step.tool,
            input: adaptedParams,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the tool with adapted parameters
        try {
          const result = await tool.execute(adaptedParams);
          
          // Update the tool use callback with the result
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: step.tool,
              input: adaptedParams,
              output: result,
              error: undefined
            });
          }
          
          return {
            success: true,
            attempts,
            output: result,
            toolExecution: {
              tool: step.tool,
              input: adaptedParams,
              output: result
            }
          };
        } catch (execError) {
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: step.tool,
              input: adaptedParams,
              output: undefined,
              error: (execError as Error).message
            });
          }
          
          // Continue to next attempt
        }
      } catch (adaptError) {
        log(`Error in parameter adaptation attempt ${attempts}: ${adaptError}`, 'agent');
        // Continue to next attempt
      }
    }
    
    return { success: false, attempts };
  }

  /**
   * Rethink the approach for the step
   */
  private async rethinkApproach(
    step: ExecutionStep,
    task: string,
    error: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      return { success: false };
    }
    
    // Prepare system prompt for rethinking the approach
    const rethinkPrompt = `${this.config.systemPrompt}

You are rethinking the approach for a failed step in a task execution. Your goal is to develop an alternative approach that avoids the error encountered.

Task: ${task}

Step: ${step.name}
Description: ${step.description}

Original approach:
${step.tool ? `Tool: ${step.tool}
Parameters: ${JSON.stringify(step.input, null, 2)}` : 'No specific tool was used.'}

Error:
${(error as Error).message}

${this.getToolsInstructionsString()}

Rethink the approach completely. You can:
1. Use a different methodology
2. Use a different tool (if appropriate)
3. Break the problem down differently
4. Make different assumptions

Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about the new approach",
  "newApproach": {
    "tool": "tool_name" (if using a tool),
    "input": { ... parameters ... } (if using a tool),
    "directOutput": "..." (if not using a tool)
  }
}`;

    try {
      // Generate new approach
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: rethinkPrompt,
        messages: [{ 
          role: 'user', 
          content: `Rethink approach for failed step: ${step.name}`
        }]
      });
      
      // Parse the response
      const content = response.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return { success: false };
      }
      
      let newApproach;
      try {
        newApproach = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, '')).newApproach;
      } catch (e) {
        try {
          newApproach = JSON.parse(jsonMatch[1].trim()).newApproach;
        } catch (e2) {
          return { success: false };
        }
      }
      
      if (!newApproach) {
        return { success: false };
      }
      
      // If the new approach uses a tool
      if (newApproach.tool && newApproach.input) {
        const tool = tools.find(t => t.name === newApproach.tool);
        
        if (!tool) {
          return { success: false };
        }
        
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: newApproach.tool,
            input: newApproach.input,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the tool
        try {
          const result = await tool.execute(newApproach.input);
          
          // Update the tool use callback with the result
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: newApproach.tool,
              input: newApproach.input,
              output: result,
              error: undefined
            });
          }
          
          return {
            success: true,
            output: result,
            toolExecution: {
              tool: newApproach.tool,
              input: newApproach.input,
              output: result
            }
          };
        } catch (execError) {
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: newApproach.tool,
              input: newApproach.input,
              output: undefined,
              error: (execError as Error).message
            });
          }
          
          return { success: false };
        }
      } else if (newApproach.directOutput) {
        // Direct output without tool
        return {
          success: true,
          output: newApproach.directOutput
        };
      }
      
      return { success: false };
    } catch (rethinkError) {
      log(`Error in rethinking approach: ${rethinkError}`, 'agent');
      return { success: false };
    }
  }

  /**
   * Decompose the problem into smaller sub-steps
   */
  private async decomposeProblem(
    step: ExecutionStep,
    task: string,
    error: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    subSteps: ExecutionStep[];
    output?: any;
  }> {
    if (!this.anthropicClient) {
      return { success: false, subSteps: [] };
    }
    
    // Prepare system prompt for problem decomposition
    const decomposePrompt = `${this.config.systemPrompt}

You are decomposing a failed step into smaller, more manageable sub-steps. Your goal is to break down the problem into parts that can be solved incrementally.

Task: ${task}

Step that failed: ${step.name}
Description: ${step.description}

Error:
${(error as Error).message}

${this.getToolsInstructionsString()}

Break down this step into 2-4 smaller sub-steps that together accomplish the original goal. Each sub-step should be:
1. Simpler than the original step
2. Focused on a specific aspect of the problem
3. More likely to succeed on its own
4. Clear and actionable

Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about how to decompose the problem",
  "subSteps": [
    {
      "name": "Sub-step 1 name",
      "description": "Detailed description",
      "tool": "tool_name" (if applicable),
      "input": { ... parameters ... } (if applicable)
    },
    ...
  ]
}`;

    try {
      // Generate sub-steps
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: decomposePrompt,
        messages: [{ 
          role: 'user', 
          content: `Decompose failed step: ${step.name}`
        }]
      });
      
      // Parse the response
      const content = response.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return { success: false, subSteps: [] };
      }
      
      let subStepsData;
      try {
        subStepsData = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, '')).subSteps;
      } catch (e) {
        try {
          subStepsData = JSON.parse(jsonMatch[1].trim()).subSteps;
        } catch (e2) {
          return { success: false, subSteps: [] };
        }
      }
      
      if (!Array.isArray(subStepsData) || subStepsData.length === 0) {
        return { success: false, subSteps: [] };
      }
      
      // Convert to ExecutionStep format
      const subSteps: ExecutionStep[] = subStepsData.map((subStep: any, index: number) => ({
        id: `substep_${step.id}_${index}`,
        name: subStep.name || `Sub-step ${index + 1}`,
        description: subStep.description || '',
        status: 'pending',
        tool: subStep.tool,
        input: subStep.input
      }));
      
      // Execute each sub-step
      const subStepOutputs: any[] = [];
      
      for (const subStep of subSteps) {
        try {
          // Call onStep callback if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: subStep.name,
              description: subStep.description,
              status: 'started'
            });
          }
          
          // Execute the sub-step
          const subStepResult = await this.executeStep(subStep, task, tools, options);
          
          // Update sub-step with result
          subStep.status = 'completed';
          subStep.output = subStepResult.output;
          
          // Store output
          subStepOutputs.push(subStepResult.output);
          
          // Call onStep callback if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: subStep.name,
              description: subStep.description,
              output: typeof subStepResult.output === 'object' ? JSON.stringify(subStepResult.output) : String(subStepResult.output),
              status: 'completed'
            });
          }
        } catch (subStepError) {
          // Sub-step failed
          subStep.status = 'failed';
          subStep.error = {
            type: this.classifyError(subStepError),
            message: (subStepError as Error).message,
            details: subStepError
          };
          
          // Call onStep callback if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: subStep.name,
              description: subStep.description,
              error: (subStepError as Error).message,
              status: 'failed'
            });
          }
          
          // Continue with next sub-step
        }
      }
      
      // If at least one sub-step completed successfully, consider the decomposition a success
      const completedSubSteps = subSteps.filter(s => s.status === 'completed');
      
      if (completedSubSteps.length > 0) {
        // Synthesize results from completed sub-steps
        const synthesisResult = await this.synthesizeResults(step, completedSubSteps, task);
        
        return {
          success: true,
          subSteps,
          output: synthesisResult
        };
      }
      
      return { success: false, subSteps };
    } catch (decomposeError) {
      log(`Error in problem decomposition: ${decomposeError}`, 'agent');
      return { success: false, subSteps: [] };
    }
  }

  /**
   * Synthesize results from sub-steps
   */
  private async synthesizeResults(
    originalStep: ExecutionStep,
    subSteps: ExecutionStep[],
    task: string
  ): Promise<string> {
    if (!this.anthropicClient) {
      return 'Failed to synthesize results';
    }
    
    // Prepare system prompt for result synthesis
    const synthesisPrompt = `${this.config.systemPrompt}

You are synthesizing results from multiple sub-steps to create a cohesive output for the original step that was decomposed.

Original task: ${task}

Original step: ${originalStep.name}
Description: ${originalStep.description}

Results from sub-steps:
${subSteps.map(s => `
Sub-step: ${s.name}
Description: ${s.description}
Result: ${typeof s.output === 'object' ? JSON.stringify(s.output, null, 2) : s.output}`).join('\n')}

Your goal is to integrate these results into a single, coherent output that fulfills the original step's purpose. The synthesis should:
1. Combine the most important information from each sub-step
2. Resolve any conflicts or inconsistencies
3. Present a unified result that directly addresses the original step

Provide your synthesized result in a clear, well-structured format.`;

    try {
      // Generate synthesis
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: 0.5, // Lower temperature for more focused synthesis
        system: synthesisPrompt,
        messages: [{ 
          role: 'user', 
          content: `Synthesize results from ${subSteps.length} sub-steps for: ${originalStep.name}`
        }]
      });
      
      return response.content[0].text;
    } catch (error) {
      log(`Error in result synthesis: ${error}`, 'agent');
      
      // Fallback: concatenate all sub-step outputs
      return subSteps
        .filter(s => s.status === 'completed')
        .map(s => `[${s.name}]: ${typeof s.output === 'object' ? JSON.stringify(s.output) : s.output}`)
        .join('\n\n');
    }
  }

  /**
   * Switch to a different tool
   */
  private async switchTool(
    step: ExecutionStep,
    task: string,
    error: any,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    success: boolean;
    output?: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      return { success: false };
    }
    
    // Cannot switch tools if the original step didn't use a tool
    if (!step.tool) {
      return { success: false };
    }
    
    // Get alternative tools (exclude the original tool)
    const alternativeTools = tools.filter(t => t.name !== step.tool);
    
    if (alternativeTools.length === 0) {
      return { success: false };
    }
    
    // Prepare system prompt for tool switching
    const switchPrompt = `${this.config.systemPrompt}

You are switching to a different tool after a tool execution failed. Your goal is to select an alternative tool that can accomplish the same task.

Task: ${task}

Step: ${step.name}
Description: ${step.description}

Original tool: ${step.tool}
Original parameters: ${JSON.stringify(step.input, null, 2)}

Error:
${(error as Error).message}

Alternative tools available:
${alternativeTools.map(tool => {
  return `- ${tool.name}: ${tool.description}
  Parameters:
${Object.entries(tool.parameters).map(([paramName, paramInfo]) => {
  return `    - ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}`;
}).join('\n')}`;
}).join('\n\n')}

Select the most appropriate alternative tool and provide the parameters needed. Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about which tool to select and why",
  "selectedTool": "tool_name",
  "parameters": { ... tool parameters ... }
}`;

    try {
      // Generate tool selection
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        system: switchPrompt,
        messages: [{ 
          role: 'user', 
          content: `Select an alternative tool for: ${step.name}`
        }]
      });
      
      // Parse the response
      const content = response.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return { success: false };
      }
      
      let toolSelection;
      try {
        toolSelection = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        try {
          toolSelection = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          return { success: false };
        }
      }
      
      if (!toolSelection.selectedTool || !toolSelection.parameters) {
        return { success: false };
      }
      
      // Find the selected tool
      const selectedTool = tools.find(t => t.name === toolSelection.selectedTool);
      
      if (!selectedTool) {
        return { success: false };
      }
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: toolSelection.selectedTool,
          input: toolSelection.parameters,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the selected tool
      try {
        const result = await selectedTool.execute(toolSelection.parameters);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: toolSelection.selectedTool,
            input: toolSelection.parameters,
            output: result,
            error: undefined
          });
        }
        
        return {
          success: true,
          output: result,
          toolExecution: {
            tool: toolSelection.selectedTool,
            input: toolSelection.parameters,
            output: result
          }
        };
      } catch (execError) {
        // Update the tool use callback with the error
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: toolSelection.selectedTool,
            input: toolSelection.parameters,
            output: undefined,
            error: (execError as Error).message
          });
        }
        
        return { success: false };
      }
    } catch (switchError) {
      log(`Error in tool switching: ${switchError}`, 'agent');
      return { success: false };
    }
  }

  /**
   * Classify the error type
   */
  private classifyError(error: any): ErrorType {
    const errorMessage = (error as Error).message || '';
    
    // Classify based on error message patterns
    if (errorMessage.includes('permission') || errorMessage.includes('access') || errorMessage.includes('unauthorized')) {
      return ErrorType.PERMISSION_ERROR;
    } else if (errorMessage.includes('not found') || errorMessage.includes('404') || errorMessage.includes('does not exist')) {
      return ErrorType.KNOWLEDGE_GAP;
    } else if (errorMessage.includes('invalid') || errorMessage.includes('format') || errorMessage.includes('malformed')) {
      return ErrorType.DATA_ERROR;
    } else if (errorMessage.includes('server') || errorMessage.includes('503') || errorMessage.includes('502')) {
      return ErrorType.API_ERROR;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('memory') || errorMessage.includes('resource')) {
      return ErrorType.SYSTEM_ERROR;
    } else if (errorMessage.includes('tool') || errorMessage.includes('execution')) {
      return ErrorType.TOOL_ERROR;
    } else if (errorMessage.includes('reasoning') || errorMessage.includes('logic') || errorMessage.includes('inference')) {
      return ErrorType.REASONING_ERROR;
    }
    
    // Default to unknown
    return ErrorType.UNKNOWN;
  }

  /**
   * Get error handling rules applicable to an error
   */
  private getErrorRules(errorType: ErrorType, toolName?: string): ErrorHandlingRule[] {
    const rules = this.config.errorRules as ErrorHandlingRule[];
    
    // First, try to find rules specific to this error type and tool
    const specificRules = rules.filter(rule => 
      rule.errorType === errorType && 
      (rule.toolName === toolName || !rule.toolName)
    );
    
    if (specificRules.length > 0) {
      return specificRules;
    }
    
    // Next, try to find rules for this error type (any tool)
    const errorTypeRules = rules.filter(rule => rule.errorType === errorType);
    
    if (errorTypeRules.length > 0) {
      return errorTypeRules;
    }
    
    // Finally, use any generic rules ('any' error type)
    const genericRules = rules.filter(rule => rule.errorType === 'any');
    
    if (genericRules.length > 0) {
      return genericRules;
    }
    
    // Fallback to a default rule
    return [{
      errorType: 'any',
      strategy: ErrorCorrectionStrategy.RETRY,
      maxAttempts: 1,
      description: 'Default retry strategy'
    }];
  }

  /**
   * Check if there are remaining steps to execute
   */
  private hasRemainingSteps(): boolean {
    return this.executionSteps.some(step => step.status === 'pending');
  }

  /**
   * Get the next executable step (one with no pending dependencies)
   */
  private getNextExecutableStep(): ExecutionStep | null {
    // Find steps that are pending
    const pendingSteps = this.executionSteps.filter(step => step.status === 'pending');
    
    if (pendingSteps.length === 0) {
      return null;
    }
    
    // Find a step with no dependencies or all dependencies completed/recovered
    return pendingSteps.find(step => {
      // If no dependencies, can execute immediately
      if (!step.dependencies || step.dependencies.length === 0) {
        return true;
      }
      
      // Check if all dependencies are completed or recovered
      const dependencies = this.executionSteps.filter(s => step.dependencies!.includes(s.id));
      return dependencies.every(d => d.status === 'completed' || d.status === 'recovered');
    }) || null;
  }

  /**
   * Get context from completed steps for a specific step
   */
  private getStepContext(stepId: string): any {
    // Find the step
    const step = this.executionSteps.find(s => s.id === stepId);
    
    if (!step) {
      return {};
    }
    
    // If the step has dependencies, include their outputs
    if (step.dependencies && step.dependencies.length > 0) {
      const dependencySteps = this.executionSteps.filter(s => 
        step.dependencies!.includes(s.id) && 
        (s.status === 'completed' || s.status === 'recovered')
      );
      
      return {
        dependencyOutputs: dependencySteps.map(d => ({
          stepId: d.id,
          stepName: d.name,
          output: d.output
        }))
      };
    }
    
    // Otherwise, include all completed steps before this one
    const currentStepIndex = this.executionSteps.findIndex(s => s.id === stepId);
    const previousSteps = this.executionSteps
      .slice(0, currentStepIndex)
      .filter(s => s.status === 'completed' || s.status === 'recovered');
    
    return {
      previousOutputs: previousSteps.map(s => ({
        stepId: s.id,
        stepName: s.name,
        output: s.output
      }))
    };
  }

  /**
   * Generate a summary of the execution
   */
  private async generateExecutionSummary(task: string): Promise<string> {
    if (!this.anthropicClient) {
      return 'Failed to generate execution summary';
    }

    const completedSteps = this.executionSteps.filter(step => 
      step.status === 'completed' || step.status === 'recovered'
    );
    const failedSteps = this.executionSteps.filter(step => 
      step.status === 'failed'
    );
    
    // Prepare system prompt for summary generation
    const summaryPrompt = `${this.config.systemPrompt}

You are generating a summary of a task execution with error recovery. Your goal is to create a comprehensive overview of what happened, what succeeded, what failed, and how errors were handled.

Task: ${task}

Execution summary:
- Total steps: ${this.executionSteps.length}
- Completed steps: ${completedSteps.filter(s => s.status === 'completed').length}
- Recovered steps: ${completedSteps.filter(s => s.status === 'recovered').length}
- Failed steps: ${failedSteps.length}

Completed steps:
${completedSteps.map(step => {
  const stepStatus = step.status === 'recovered' ? ' (Recovered)' : '';
  return `- ${step.name}${stepStatus}: ${typeof step.output === 'object' ? JSON.stringify(step.output) : step.output}`;
}).join('\n')}

${failedSteps.length > 0 ? `Failed steps:
${failedSteps.map(step => {
  return `- ${step.name}: ${step.error?.message || 'Unknown error'}`;
}).join('\n')}` : ''}

${this.errorLogs.length > 0 ? `Error recovery summary:
${this.errorLogs.map(log => {
  const step = this.executionSteps.find(s => s.id === log.step);
  const recoveryStatus = log.recovery ? 
    (log.recovery.success ? `Recovery succeeded using ${log.recovery.strategy}` : `Recovery failed using ${log.recovery.strategy}`) : 
    'No recovery attempted';
  return `- ${step?.name || 'Unknown step'}: ${recoveryStatus}`;
}).join('\n')}` : ''}

Generate a comprehensive summary that:
1. Explains what the task was trying to accomplish
2. Summarizes the execution process, highlighting key steps
3. Explains any errors encountered and how they were handled
4. Provides the final outcome or result
5. Includes any relevant insights or recommendations

The summary should be clear, informative, and focus on the most important aspects of the execution.`;

    try {
      // Generate summary
      const response = await this.anthropicClient.messages.create({
        model: this.config.modelName as string,
        max_tokens: this.config.maxTokens,
        temperature: 0.5, // Lower temperature for more focused summary
        system: summaryPrompt,
        messages: [{ 
          role: 'user', 
          content: `Generate execution summary for: ${task}`
        }]
      });
      
      return response.content[0].text;
    } catch (error) {
      log(`Error generating execution summary: ${error}`, 'agent');
      
      // Generate a simple fallback summary
      return `Task: ${task}

Execution Summary:
- ${completedSteps.length} of ${this.executionSteps.length} steps completed successfully
${failedSteps.length > 0 ? `- ${failedSteps.length} steps failed` : ''}
${completedSteps.filter(s => s.status === 'recovered').length > 0 ? `- ${completedSteps.filter(s => s.status === 'recovered').length} errors were successfully recovered from` : ''}

Results:
${completedSteps.map(step => `- ${step.name}: ${typeof step.output === 'object' ? JSON.stringify(step.output) : step.output}`).join('\n')}`;
    }
  }

  /**
   * Get a formatted execution summary for the response
   */
  private getExecutionSummary(): string {
    const completedSteps = this.executionSteps.filter(step => 
      step.status === 'completed' || step.status === 'recovered'
    );
    const failedSteps = this.executionSteps.filter(step => 
      step.status === 'failed'
    );
    
    let summary = `# Execution Summary\n\n`;
    summary += `- Total steps: ${this.executionSteps.length}\n`;
    summary += `- Completed steps: ${completedSteps.filter(s => s.status === 'completed').length}\n`;
    summary += `- Recovered steps: ${completedSteps.filter(s => s.status === 'recovered').length}\n`;
    summary += `- Failed steps: ${failedSteps.length}\n\n`;
    
    summary += `## Steps Detail\n\n`;
    
    this.executionSteps.forEach(step => {
      const statusEmoji = step.status === 'completed' ? '✅' : 
                        step.status === 'recovered' ? '🔄' : 
                        step.status === 'failed' ? '❌' : 
                        '⏳';
      
      summary += `### ${statusEmoji} ${step.name}\n\n`;
      summary += `${step.description}\n\n`;
      
      if (step.tool) {
        summary += `**Tool:** ${step.tool}\n\n`;
        summary += `**Input:**\n\`\`\`json\n${JSON.stringify(step.input, null, 2)}\n\`\`\`\n\n`;
      }
      
      if (step.status === 'completed' || step.status === 'recovered') {
        summary += `**Output:**\n\`\`\`\n${typeof step.output === 'object' ? JSON.stringify(step.output, null, 2) : step.output}\n\`\`\`\n\n`;
      }
      
      if (step.status === 'failed') {
        summary += `**Error:**\n\`\`\`\n${step.error?.message || 'Unknown error'}\n\`\`\`\n\n`;
      }
      
      if (step.status === 'recovered') {
        summary += `**Recovery:**\n`;
        summary += `- Strategy: ${step.recovery?.strategy}\n`;
        summary += `- Attempts: ${step.recovery?.attempts}\n`;
        summary += `- Notes: ${step.recovery?.notes}\n\n`;
      }
      
      if (step.startTime && step.endTime) {
        const duration = (step.endTime.getTime() - step.startTime.getTime()) / 1000;
        summary += `**Duration:** ${duration.toFixed(2)}s\n\n`;
      }
      
      summary += `---\n\n`;
    });
    
    if (this.errorLogs.length > 0) {
      summary += `## Error Recovery Report\n\n`;
      
      this.errorLogs.forEach((log, index) => {
        const step = this.executionSteps.find(s => s.id === log.step);
        
        summary += `### Error ${index + 1}: ${step?.name || 'Unknown step'}\n\n`;
        summary += `**Error Type:** ${step?.error?.type || 'Unknown'}\n`;
        summary += `**Message:** ${step?.error?.message || 'Unknown error'}\n\n`;
        
        if (log.recovery) {
          const statusEmoji = log.recovery.success ? '✅' : '❌';
          summary += `**Recovery ${statusEmoji}:**\n`;
          summary += `- Strategy: ${log.recovery.strategy}\n`;
          summary += `- Result: ${log.recovery.success ? 'Succeeded' : 'Failed'}\n\n`;
        } else {
          summary += `**Recovery:** Not attempted\n\n`;
        }
        
        summary += `---\n\n`;
      });
    }
    
    return summary;
  }

  /**
   * Get tools instructions string
   */
  private getToolsInstructionsString(): string {
    const tools = this.availableTools;
    
    if (tools.length === 0) {
      return 'No tools are available for this task.';
    }
    
    let toolsString = 'Available tools:\n';
    
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
    this.errorLogs = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}