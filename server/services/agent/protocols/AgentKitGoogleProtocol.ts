/**
 * Agent Kit by Google Protocol Implementation
 * 
 * Implements Google's Agent Kit framework for systematic agent development.
 * Focuses on scaffolding, reusable components, and debugging.
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
import OpenAI from 'openai';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Agent framework components
interface AgentComponent {
  id: string;
  name: string;
  description: string;
  prompt: string;
  inputSchema: Record<string, any>;
  outputSchema: Record<string, any>;
}

interface DebugTrace {
  step: number;
  component: string;
  input: Record<string, any>;
  output: Record<string, any>;
  duration: number;
  timestamp: string;
  annotations?: string[];
}

interface AgentScaffold {
  name: string;
  description: string;
  components: string[];
  flow: Array<{
    componentId: string;
    next: string | null;
    condition?: string;
  }>;
}

interface ScaffoldExecutionState {
  currentComponentId: string | null;
  variables: Record<string, any>;
  completed: boolean;
  error: string | null;
  debugTraces: DebugTrace[];
  startTime: string;
  endTime: string | null;
}

export class AgentKitGoogleProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Agent Kit by Google, a systematic agent development framework.
You excel at:
1. Creating reusable agent components with clear interfaces
2. Scaffolding agents from well-defined components
3. Comprehensive debugging and tracing
4. Reproducible agent development
5. Principled agent design practices`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.2,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.SELF_IMPROVEMENT,
      ProtocolCapabilities.SYSTEMATIC_THINKING,
      ProtocolCapabilities.TOOL_USE
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Agent Kit state
  private componentLibrary: AgentComponent[] = [];
  private currentScaffold: AgentScaffold | null = null;
  private executionState: ScaffoldExecutionState | null = null;
  private taskAnalysis: string = '';

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Agent Kit by Google',
      version: '1.0.0',
      description: 'Systematic agent development framework with scaffolding and debugging',
      capabilities: [
        ProtocolCapabilities.SELF_IMPROVEMENT,
        ProtocolCapabilities.SYSTEMATIC_THINKING,
        ProtocolCapabilities.TOOL_USE
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
    
    // Initialize component library
    this.initializeComponentLibrary();
    
    // Reset execution state
    this.currentScaffold = null;
    this.executionState = null;
    this.taskAnalysis = '';
    
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
          name: 'Task Analysis',
          description: 'Analyzing task for component selection',
          status: 'started'
        });
      }

      // Step 1: Analyze the task
      await this.analyzeTask(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Analysis',
          description: 'Task analysis completed',
          output: { analysis: this.taskAnalysis.substring(0, 200) + '...' },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Scaffold Creation',
          description: 'Creating agent scaffold from components',
          status: 'started'
        });
      }

      // Step 2: Create agent scaffold
      await this.createAgentScaffold(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Scaffold Creation',
          description: 'Agent scaffold created',
          output: { 
            scaffoldName: this.currentScaffold?.name,
            components: this.currentScaffold?.components.length
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Execution',
          description: 'Executing agent on task',
          status: 'started'
        });
      }

      // Step 3: Execute the agent scaffold
      await this.executeAgentScaffold(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Execution',
          description: 'Agent execution completed',
          output: { 
            traceCount: this.executionState?.debugTraces.length,
            completed: this.executionState?.completed
          },
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.formatFinalResponse();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'agentkitgoogle',
        metadata: {
          scaffold: this.currentScaffold?.name,
          components: this.currentScaffold?.components,
          debugTraces: this.executionState?.debugTraces.length
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Agent Kit by Google Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Initialize component library
   */
  private initializeComponentLibrary(): void {
    this.componentLibrary = [
      // Information gathering components
      {
        id: 'task_analyser',
        name: 'Task Analyzer',
        description: 'Analyzes a task to extract key requirements and constraints',
        prompt: `Analyze the given task to identify:
1. Main goal(s) and objectives
2. Key requirements
3. Constraints and limitations
4. Success criteria
5. Potential challenges

Be systematic and comprehensive in your analysis.`,
        inputSchema: {
          task: 'string'
        },
        outputSchema: {
          analysis: 'string',
          main_goals: 'string[]',
          requirements: 'string[]',
          constraints: 'string[]',
          success_criteria: 'string[]',
          challenges: 'string[]'
        }
      },
      {
        id: 'web_researcher',
        name: 'Web Researcher',
        description: 'Searches for information on the web',
        prompt: `Search for information relevant to the query. Focus on:
1. Finding reliable and up-to-date sources
2. Extracting key information
3. Providing diverse perspectives when relevant
4. Citing sources properly`,
        inputSchema: {
          query: 'string',
          max_results: 'number?'
        },
        outputSchema: {
          results: 'object[]',
          summary: 'string'
        }
      },
      
      // Planning components
      {
        id: 'step_planner',
        name: 'Step Planner',
        description: 'Creates a step-by-step plan to accomplish a goal',
        prompt: `Create a detailed step-by-step plan to accomplish the given goal. For each step:
1. Provide a clear description of the action
2. Explain why this step is necessary
3. Identify any dependencies on previous steps
4. Note any potential challenges or alternatives

Be thorough and logical in your planning.`,
        inputSchema: {
          goal: 'string',
          context: 'string?',
          constraints: 'string[]?'
        },
        outputSchema: {
          plan: 'object[]',
          estimated_completion_time: 'string?',
          required_resources: 'string[]?'
        }
      },
      {
        id: 'decision_maker',
        name: 'Decision Maker',
        description: 'Evaluates options and makes a decision based on criteria',
        prompt: `Evaluate the given options based on the criteria and make a decision. Consider:
1. How well each option meets each criterion
2. The relative importance of different criteria
3. Any tradeoffs between options
4. Potential risks and uncertainties

Explain your reasoning clearly.`,
        inputSchema: {
          options: 'string[]',
          criteria: 'string[]',
          context: 'string?'
        },
        outputSchema: {
          decision: 'string',
          ranking: 'object[]',
          reasoning: 'string'
        }
      },
      
      // Execution components
      {
        id: 'code_generator',
        name: 'Code Generator',
        description: 'Generates code based on requirements',
        prompt: `Generate code that satisfies the given requirements. Ensure that:
1. The code is correct, efficient, and follows best practices
2. The code is well-documented with comments
3. Edge cases are handled appropriately
4. The code is secure and robust
5. The code is easy to understand and maintain`,
        inputSchema: {
          requirements: 'string',
          language: 'string',
          context: 'string?'
        },
        outputSchema: {
          code: 'string',
          explanation: 'string',
          usage_examples: 'string?'
        }
      },
      {
        id: 'tool_user',
        name: 'Tool User',
        description: 'Uses available tools to accomplish tasks',
        prompt: `Use the appropriate tools to accomplish the task. Consider:
1. Which tool is most suitable for the specific need
2. How to properly format the input for the tool
3. How to interpret and use the output from the tool
4. Whether multiple tools need to be used in sequence`,
        inputSchema: {
          task: 'string',
          available_tools: 'string[]',
          context: 'string?'
        },
        outputSchema: {
          tool_calls: 'object[]',
          result: 'string'
        }
      },
      
      // Content generation components
      {
        id: 'content_creator',
        name: 'Content Creator',
        description: 'Creates various types of content based on specifications',
        prompt: `Create content according to the given specifications. Ensure that:
1. The content meets the specified purpose and audience
2. The content is well-structured and flows logically
3. The content is engaging and effective
4. The content follows the specified style and tone
5. The content is accurate and properly sourced if needed`,
        inputSchema: {
          content_type: 'string',
          specifications: 'object',
          audience: 'string?',
          tone: 'string?'
        },
        outputSchema: {
          content: 'string',
          notes: 'string?'
        }
      },
      {
        id: 'summarizer',
        name: 'Summarizer',
        description: 'Creates concise summaries of longer content',
        prompt: `Create a concise summary of the given content. Focus on:
1. Capturing the main ideas and key points
2. Maintaining accuracy and not distorting the original message
3. Eliminating unnecessary details while preserving important context
4. Using clear and direct language`,
        inputSchema: {
          content: 'string',
          max_length: 'number?',
          focus_areas: 'string[]?'
        },
        outputSchema: {
          summary: 'string',
          key_points: 'string[]?'
        }
      },
      
      // Evaluation components
      {
        id: 'output_evaluator',
        name: 'Output Evaluator',
        description: 'Evaluates outputs against criteria',
        prompt: `Evaluate the given output against the specified criteria. Consider:
1. How well the output meets each criterion
2. Any strengths or weaknesses in the output
3. Specific areas for improvement
4. Overall quality and effectiveness

Be objective and specific in your evaluation.`,
        inputSchema: {
          output: 'string',
          criteria: 'string[]',
          context: 'string?'
        },
        outputSchema: {
          evaluation: 'object',
          score: 'number',
          feedback: 'string'
        }
      },
      {
        id: 'error_detector',
        name: 'Error Detector',
        description: 'Identifies errors and issues in outputs',
        prompt: `Carefully examine the given output to identify any errors or issues. Look for:
1. Factual inaccuracies
2. Logical inconsistencies
3. Grammatical or spelling errors
4. Unclear or ambiguous statements
5. Any other problems that affect quality or effectiveness

Be thorough and precise in identifying issues.`,
        inputSchema: {
          output: 'string',
          context: 'string?',
          reference: 'string?'
        },
        outputSchema: {
          errors: 'object[]',
          has_critical_errors: 'boolean',
          recommendations: 'string'
        }
      }
    ];
  }

  /**
   * Analyze the task
   */
  private async analyzeTask(task: string, options: ProtocolExecutionOptions): Promise<void> {
    const analysisPrompt = `As an Agent Kit developer, analyze this task to determine the appropriate components and scaffold:

Task: ${task}

Available Components:
${this.componentLibrary.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Analyze the task in terms of:
1. The primary objective and key requirements
2. The types of components needed for this task
3. The most effective sequence of component execution
4. Any specific challenges or considerations
5. How tools might be integrated (if needed)

Provide a detailed analysis to guide scaffold creation.`;

    // Get analysis from LLM
    const analysis = await this.getResponseFromLLM(analysisPrompt);
    
    // Store the analysis
    this.taskAnalysis = analysis;
  }

  /**
   * Create an agent scaffold based on task analysis
   */
  private async createAgentScaffold(options: ProtocolExecutionOptions): Promise<void> {
    const scaffoldPrompt = `Based on this task analysis, create an Agent Kit scaffold:

Analysis:
${this.taskAnalysis}

Available Components:
${this.componentLibrary.map(c => `- ${c.id}: ${c.name} - ${c.description}`).join('\n')}

Create a scaffold that:
1. Has an appropriate name and description
2. Selects the most relevant components (3-7 components)
3. Defines a logical flow between components
4. Includes appropriate conditionals where needed

Respond with a JSON object defining the scaffold with these properties:
{
  "name": "Scaffold name",
  "description": "Scaffold description",
  "components": ["component_id1", "component_id2", ...],
  "flow": [
    {
      "componentId": "component_id1",
      "next": "component_id2",
      "condition": null
    },
    {
      "componentId": "component_id2",
      "next": null,
      "condition": null
    }
  ]
}`;

    // Get scaffold definition from LLM
    const scaffoldResponse = await this.getResponseFromLLM(scaffoldPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = scaffoldResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const scaffoldJson = JSON.parse(jsonMatch[0]);
        
        // Basic validation of scaffold structure
        if (!scaffoldJson.name || !Array.isArray(scaffoldJson.components) || 
            !Array.isArray(scaffoldJson.flow)) {
          throw new Error('Invalid scaffold structure');
        }
        
        // Validate component references
        for (const componentId of scaffoldJson.components) {
          if (!this.componentLibrary.some(c => c.id === componentId)) {
            throw new Error(`Invalid component reference: ${componentId}`);
          }
        }
        
        // Store the scaffold
        this.currentScaffold = scaffoldJson;
      } else {
        throw new Error('Could not extract scaffold JSON');
      }
    } catch (error) {
      log(`Error parsing scaffold definition: ${error}`, 'agent');
      
      // Create a basic scaffold as fallback
      this.createFallbackScaffold();
    }
  }

  /**
   * Create a basic fallback scaffold
   */
  private createFallbackScaffold(): void {
    // Use a basic sequence of task_analyser -> step_planner -> tool_user -> output_evaluator
    this.currentScaffold = {
      name: 'Basic Task Processing Scaffold',
      description: 'A simple linear scaffold for analyzing, planning, executing, and evaluating tasks',
      components: ['task_analyser', 'step_planner', 'tool_user', 'output_evaluator'],
      flow: [
        {
          componentId: 'task_analyser',
          next: 'step_planner',
          condition: null
        },
        {
          componentId: 'step_planner',
          next: 'tool_user',
          condition: null
        },
        {
          componentId: 'tool_user',
          next: 'output_evaluator',
          condition: null
        },
        {
          componentId: 'output_evaluator',
          next: null,
          condition: null
        }
      ]
    };
  }

  /**
   * Execute the agent scaffold on a task
   */
  private async executeAgentScaffold(task: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.currentScaffold) {
      throw new Error('No scaffold available for execution');
    }
    
    // Initialize execution state
    this.executionState = {
      currentComponentId: this.getStartingComponentId(),
      variables: {
        task,
        input: task,
        available_tools: this.availableTools.map(t => t.name),
        context: ''
      },
      completed: false,
      error: null,
      debugTraces: [],
      startTime: new Date().toISOString(),
      endTime: null
    };
    
    // Maximum number of steps to prevent infinite loops
    const maxSteps = 20;
    let currentStep = 0;
    
    // Execute components until completion or max steps reached
    while (this.executionState.currentComponentId && 
           !this.executionState.completed && 
           currentStep < maxSteps) {
      
      // Execute current component
      await this.executeComponent(this.executionState.currentComponentId, options);
      
      currentStep++;
    }
    
    // Record end time
    this.executionState.endTime = new Date().toISOString();
    
    // If max steps reached but execution not completed
    if (currentStep >= maxSteps && !this.executionState.completed) {
      this.executionState.error = 'Maximum number of steps reached';
    }
  }

  /**
   * Get the starting component ID
   */
  private getStartingComponentId(): string | null {
    if (!this.currentScaffold || !this.currentScaffold.flow || this.currentScaffold.flow.length === 0) {
      return null;
    }
    
    // Start with the first component in the flow
    return this.currentScaffold.flow[0].componentId;
  }

  /**
   * Execute a single component
   */
  private async executeComponent(componentId: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.currentScaffold || !this.executionState) {
      throw new Error('Scaffold or execution state not initialized');
    }
    
    // Find the component definition
    const componentDef = this.componentLibrary.find(c => c.id === componentId);
    if (!componentDef) {
      throw new Error(`Component not found: ${componentId}`);
    }
    
    // Find the flow node
    const flowNode = this.currentScaffold.flow.find(f => f.componentId === componentId);
    if (!flowNode) {
      throw new Error(`Component not found in flow: ${componentId}`);
    }
    
    const startTime = Date.now();
    
    try {
      // Prepare component input
      const componentInput = this.prepareComponentInput(componentDef, this.executionState.variables);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Component: ${componentDef.name}`,
          description: `Executing ${componentDef.name} component`,
          status: 'started'
        });
      }
      
      // Execute the component
      const componentOutput = await this.executeComponentLogic(componentDef, componentInput, options);
      
      // Record execution time
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Add to debug traces
      this.executionState.debugTraces.push({
        step: this.executionState.debugTraces.length + 1,
        component: componentId,
        input: componentInput,
        output: componentOutput,
        duration,
        timestamp: new Date().toISOString()
      });
      
      // Update variables with component output
      Object.entries(componentOutput).forEach(([key, value]) => {
        this.executionState!.variables[`${componentId}_${key}`] = value;
      });
      
      // Special handling for specific components
      if (componentId === 'tool_user' && componentOutput.tool_calls) {
        // Execute any tool calls
        const toolResults = await this.executeToolCalls(componentOutput.tool_calls, options);
        this.executionState.variables.tool_results = toolResults;
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Component: ${componentDef.name}`,
          description: `Executed ${componentDef.name} component`,
          output: componentOutput,
          status: 'completed'
        });
      }
      
      // Determine next component
      let nextComponentId: string | null = null;
      
      if (flowNode.condition) {
        // Evaluate condition to determine next component
        const conditionResult = this.evaluateCondition(flowNode.condition, this.executionState.variables);
        nextComponentId = conditionResult ? flowNode.next : null;
      } else {
        // Simple transition
        nextComponentId = flowNode.next;
      }
      
      // Update current component
      this.executionState.currentComponentId = nextComponentId;
      
      // Check if execution is complete
      if (!nextComponentId) {
        this.executionState.completed = true;
      }
      
    } catch (error) {
      // Record error
      this.executionState.error = (error as Error).message;
      
      // Add to debug traces
      this.executionState.debugTraces.push({
        step: this.executionState.debugTraces.length + 1,
        component: componentId,
        input: {}, // We may not have input in an error case
        output: { error: (error as Error).message },
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        annotations: ['error']
      });
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Component: ${componentDef.name}`,
          description: `Error executing ${componentDef.name} component`,
          error: (error as Error).message,
          status: 'failed'
        });
      }
      
      // Mark execution as completed with error
      this.executionState.completed = true;
    }
  }

  /**
   * Prepare input for a component
   */
  private prepareComponentInput(component: AgentComponent, variables: Record<string, any>): Record<string, any> {
    const input: Record<string, any> = {};
    
    // For each input field in the schema
    Object.entries(component.inputSchema).forEach(([key, type]) => {
      // Check if the variable exists
      if (variables[key] !== undefined) {
        input[key] = variables[key];
      } else if (key === 'task' && variables.input) {
        // Special case: use input as task if available
        input[key] = variables.input;
      } else if (variables[`${component.id}_${key}`]) {
        // Check for component-specific variables
        input[key] = variables[`${component.id}_${key}`];
      } else if (type.toString().endsWith('?')) {
        // Optional parameter, can be omitted
      } else {
        // Try to find a reasonable default or substitution
        if (key === 'context' && variables.summary) {
          input[key] = variables.summary;
        } else if (key === 'available_tools') {
          input[key] = variables.available_tools || [];
        }
      }
    });
    
    return input;
  }

  /**
   * Execute component logic
   */
  private async executeComponentLogic(
    component: AgentComponent, 
    input: Record<string, any>,
    options: ProtocolExecutionOptions
  ): Promise<Record<string, any>> {
    // Create full prompt for the component
    const componentPrompt = `${component.prompt}

Input:
${JSON.stringify(input, null, 2)}

Execute this component and provide the output as a JSON object with these fields:
${Object.entries(component.outputSchema).map(([key, type]) => `- ${key}: ${type}`).join('\n')}

Ensure your response is a valid JSON object.`;

    // Get component response from LLM
    const componentResponse = await this.getResponseFromLLM(componentPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = componentResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, try to create output structure from the response
      const outputSchema = component.outputSchema;
      const outputWithFallback: Record<string, any> = {};
      
      // Set the main output field to the response
      const mainOutputField = Object.keys(outputSchema)[0];
      outputWithFallback[mainOutputField] = componentResponse;
      
      // Add empty values for other fields
      Object.keys(outputSchema).forEach(key => {
        if (key !== mainOutputField) {
          // Create appropriate empty value based on type
          const type = outputSchema[key].toString();
          if (type.includes('[]') || type.includes('array')) {
            outputWithFallback[key] = [];
          } else if (type.includes('object')) {
            outputWithFallback[key] = {};
          } else if (type.includes('number')) {
            outputWithFallback[key] = 0;
          } else if (type.includes('boolean')) {
            outputWithFallback[key] = false;
          } else {
            outputWithFallback[key] = '';
          }
        }
      });
      
      return outputWithFallback;
    } catch (error) {
      log(`Error parsing component output: ${error}`, 'agent');
      throw new Error(`Failed to parse component output: ${error}`);
    }
  }

  /**
   * Execute tool calls
   */
  private async executeToolCalls(
    toolCalls: Array<{tool: string, params: Record<string, any>}>,
    options: ProtocolExecutionOptions
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const call of toolCalls) {
      const toolName = call.tool;
      const toolParams = call.params;
      
      // Find the tool
      const tool = this.availableTools.find(t => 
        t.name === toolName || 
        t.name.toLowerCase() === toolName.toLowerCase()
      );
      
      if (!tool) {
        results[toolName] = { error: `Tool not found: ${toolName}` };
        continue;
      }
      
      try {
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: tool.name,
            input: toolParams,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the tool
        const toolResult = await tool.execute(toolParams);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: tool.name,
            input: toolParams,
            output: toolResult,
            error: undefined
          });
        }
        
        // Store the result
        results[toolName] = toolResult;
      } catch (error) {
        // Update the tool use callback with the error
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: tool.name,
            input: toolParams,
            output: undefined,
            error: (error as Error).message
          });
        }
        
        // Store the error
        results[toolName] = { error: (error as Error).message };
      }
    }
    
    return results;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(condition: string, variables: Record<string, any>): boolean {
    // Simple condition evaluation
    try {
      // Handle common condition formats
      if (condition.includes('==')) {
        const [left, right] = condition.split('==').map(s => s.trim());
        const leftValue = this.getValueFromPath(variables, left);
        return leftValue == right; // Intentionally use loose equality
      } else if (condition.includes('!=')) {
        const [left, right] = condition.split('!=').map(s => s.trim());
        const leftValue = this.getValueFromPath(variables, left);
        return leftValue != right; // Intentionally use loose inequality
      } else if (condition.includes('>')) {
        const [left, right] = condition.split('>').map(s => s.trim());
        const leftValue = this.getValueFromPath(variables, left);
        return leftValue > Number(right);
      } else if (condition.includes('<')) {
        const [left, right] = condition.split('<').map(s => s.trim());
        const leftValue = this.getValueFromPath(variables, left);
        return leftValue < Number(right);
      } else if (condition.includes('contains')) {
        const [left, right] = condition.split('contains').map(s => s.trim());
        const leftValue = String(this.getValueFromPath(variables, left));
        return leftValue.includes(right.replace(/['"]/g, ''));
      } else if (condition === 'true') {
        return true;
      } else if (condition === 'false') {
        return false;
      }
      
      // Direct variable reference (treat as boolean)
      if (variables[condition] !== undefined) {
        return Boolean(variables[condition]);
      }
      
      // Path reference
      if (condition.includes('.')) {
        return Boolean(this.getValueFromPath(variables, condition));
      }
    } catch (error) {
      log(`Error evaluating condition '${condition}': ${error}`, 'agent');
    }
    
    // Default to true if condition can't be evaluated
    return true;
  }

  /**
   * Get a value from a nested path (e.g., "result.score")
   */
  private getValueFromPath(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(): string {
    if (!this.currentScaffold || !this.executionState) {
      return 'Error: Agent execution incomplete';
    }
    
    let response = `# Agent Kit by Google - Execution Report\n\n`;
    
    // Scaffold information
    response += `## Agent Scaffold: ${this.currentScaffold.name}\n`;
    response += `${this.currentScaffold.description}\n\n`;
    
    // Component sequence
    response += `## Component Sequence\n`;
    response += this.currentScaffold.components.map(cId => {
      const component = this.componentLibrary.find(c => c.id === cId);
      return `- ${component?.name} (${cId})`;
    }).join('\n');
    response += `\n\n`;
    
    // Execution status
    response += `## Execution Status\n`;
    response += `- **Status**: ${this.executionState.completed ? 'Completed' : 'Incomplete'}`;
    if (this.executionState.error) {
      response += ` with Error: ${this.executionState.error}`;
    }
    response += `\n`;
    
    if (this.executionState.startTime && this.executionState.endTime) {
      const startTime = new Date(this.executionState.startTime);
      const endTime = new Date(this.executionState.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      response += `- **Duration**: ${durationMs}ms\n`;
    }
    
    response += `- **Steps Executed**: ${this.executionState.debugTraces.length}\n\n`;
    
    // Execution traces
    response += `## Execution Traces\n`;
    
    for (const trace of this.executionState.debugTraces) {
      const component = this.componentLibrary.find(c => c.id === trace.component);
      
      response += `### Step ${trace.step}: ${component?.name}\n`;
      response += `- **Duration**: ${trace.duration}ms\n`;
      
      response += `- **Input**:\n`;
      response += '```json\n';
      response += JSON.stringify(trace.input, null, 2);
      response += '\n```\n';
      
      response += `- **Output**:\n`;
      response += '```json\n';
      response += JSON.stringify(trace.output, null, 2);
      response += '\n```\n';
      
      if (trace.annotations && trace.annotations.length > 0) {
        response += `- **Annotations**: ${trace.annotations.join(', ')}\n`;
      }
      
      response += '\n';
    }
    
    // Final result
    if (this.executionState.completed && this.executionState.debugTraces.length > 0) {
      const lastTrace = this.executionState.debugTraces[this.executionState.debugTraces.length - 1];
      
      response += `## Final Result\n`;
      
      if (lastTrace.output.error) {
        response += `Error: ${lastTrace.output.error}\n`;
      } else {
        // Extract main output field based on component
        const component = this.componentLibrary.find(c => c.id === lastTrace.component);
        if (component) {
          const mainOutputField = Object.keys(component.outputSchema)[0];
          if (lastTrace.output[mainOutputField]) {
            response += typeof lastTrace.output[mainOutputField] === 'string' 
              ? lastTrace.output[mainOutputField] 
              : JSON.stringify(lastTrace.output[mainOutputField], null, 2);
          } else {
            response += JSON.stringify(lastTrace.output, null, 2);
          }
        } else {
          response += JSON.stringify(lastTrace.output, null, 2);
        }
      }
    }
    
    return response;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    if (!this.executionState?.variables.tool_results) {
      return undefined;
    }
    
    const toolResults = this.executionState.variables.tool_results;
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    for (const [toolName, result] of Object.entries(toolResults)) {
      // Try to find the corresponding tool call from debug traces
      let toolParams: Record<string, any> = {};
      
      for (const trace of this.executionState.debugTraces) {
        if (trace.component === 'tool_user' && trace.output.tool_calls) {
          const matchingCall = trace.output.tool_calls.find((call: any) => call.tool === toolName);
          if (matchingCall) {
            toolParams = matchingCall.params || {};
            break;
          }
        }
      }
      
      toolCalls.push({
        name: toolName,
        input: toolParams,
        output: result
      });
    }
    
    return toolCalls.length > 0 ? toolCalls : undefined;
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
    // Reset state
    this.currentScaffold = null;
    this.executionState = null;
    this.taskAnalysis = '';
    this.initialized = false;
    
    return Promise.resolve();
  }
}