/**
 * AutoGen Protocol Implementation
 * 
 * Implements Microsoft's AutoGen protocol for collaborative multi-agent planning.
 * Focuses on tool use, planning and coordination between specialized agents.
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

// Agent types
enum AutoGenAgentType {
  ASSISTANT = 'assistant',
  USER_PROXY = 'user_proxy',
  CRITIC = 'critic',
  CODE_EXECUTOR = 'code_executor',
  PLANNER = 'planner',
  RETRIEVER = 'retriever'
}

// Agent definitions
interface AutoGenAgent {
  id: string;
  type: AutoGenAgentType;
  name: string;
  description: string;
  capabilities: string[];
  systemPrompt: string;
}

// Message definitions
interface AutoGenMessage {
  from: string;
  to: string;
  content: string;
  timestamp: string;
  type: 'text' | 'code' | 'tool_request' | 'tool_response' | 'feedback';
  metadata?: Record<string, any>;
}

// Conversation state
interface AutoGenConversation {
  messages: AutoGenMessage[];
  currentSpeaker: string;
  initiator: string;
  taskState: {
    status: 'started' | 'in_progress' | 'completed' | 'failed';
    currentPlan?: string[];
    currentStep?: number;
    error?: string;
  };
}

export class AutoGenProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Microsoft's AutoGen, a collaborative multi-agent framework specialized in:
1. Coordinating multiple specialized agents to solve complex tasks
2. Effective tool use through planning and execution
3. Code generation and execution
4. Recursive task refinement and solving
5. Sophisticated planning and error handling`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.COLLABORATION,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.CODE_EXECUTION,
      ProtocolCapabilities.MULTI_STEP
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // AutoGen state
  private agents: AutoGenAgent[] = [];
  private conversation: AutoGenConversation = {
    messages: [],
    currentSpeaker: '',
    initiator: '',
    taskState: {
      status: 'started'
    }
  };
  private includeCodeExecutor: boolean = false;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'AutoGen',
      version: '1.0.0',
      description: 'Microsoft\'s collaborative multi-agent planning and tool use',
      capabilities: [
        ProtocolCapabilities.COLLABORATION,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.CODE_EXECUTION,
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
    
    // Reset AutoGen state
    this.agents = [];
    this.conversation = {
      messages: [],
      currentSpeaker: '',
      initiator: '',
      taskState: {
        status: 'started'
      }
    };
    
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
          name: 'Agent Configuration',
          description: 'Setting up agent group for the task',
          status: 'started'
        });
      }

      // Step 1: Determine and create agents
      await this.setupAgentGroup(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Configuration',
          description: `Created agent group with ${this.agents.length} agents`,
          output: { agents: this.agents.map(a => a.name) },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Planning Phase',
          description: 'Initiating task planning with planner agent',
          status: 'started'
        });
      }

      // Step 2: Planning phase - Planner agent creates a plan
      await this.runPlanningPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Planning Phase',
          description: 'Planning phase completed',
          output: { plan: this.conversation.taskState.currentPlan },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Execution Phase',
          description: 'Executing plan with collaborative agents',
          status: 'started'
        });
      }

      // Step 3: Execution phase - Execute the plan with collaborative agents
      await this.runExecutionPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Execution Phase',
          description: 'Execution phase completed',
          output: { 
            stepCount: this.conversation.taskState.currentStep,
            status: this.conversation.taskState.status 
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Critique Phase',
          description: 'Reviewing and refining results',
          status: 'started'
        });
      }

      // Step 4: Critique and refinement phase
      await this.runCritiquePhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Critique Phase',
          description: 'Critique and refinement completed',
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
        protocol: 'autogen',
        metadata: {
          agents: this.agents.map(a => a.name),
          messageCount: this.conversation.messages.length,
          status: this.conversation.taskState.status
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`AutoGen Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Setup the agent group for the task
   */
  private async setupAgentGroup(task: string, options: ProtocolExecutionOptions): Promise<void> {
    // Determine if task requires code execution
    this.includeCodeExecutor = this.taskRequiresCodeExecution(task);
    
    // Create the core agents
    
    // 1. Assistant Agent - Primary problem solver
    const assistantAgent: AutoGenAgent = {
      id: 'assistant',
      type: AutoGenAgentType.ASSISTANT,
      name: 'Assistant',
      description: 'Primary problem-solving agent that can plan and coordinate task execution',
      capabilities: ['Planning', 'Problem solving', 'Tool use', 'Coordination'],
      systemPrompt: `You are an intelligent assistant AI that excels at solving complex problems through careful planning and execution. 
Your goal is to help solve the given task by collaborating with other specialized agents.
You can use tools, query information, and delegate subtasks to other agents.
Always be thorough, logical, and show your reasoning.`
    };
    
    // 2. User Proxy Agent - Represents the user and can execute tools
    const userProxyAgent: AutoGenAgent = {
      id: 'user_proxy',
      type: AutoGenAgentType.USER_PROXY,
      name: 'UserProxy',
      description: 'Represents the user and can execute tools, code, and verify outputs',
      capabilities: ['Tool execution', 'Code execution', 'Verification', 'Feedback'],
      systemPrompt: `You are a User Proxy agent that can execute tools and code on behalf of the user.
Your primary responsibilities are:
1. Execute tools and code when requested by other agents
2. Verify and validate outputs
3. Provide feedback on results
4. Bridge communication between technical components and other agents`
    };
    
    // 3. Critic Agent - Evaluates plans and results
    const criticAgent: AutoGenAgent = {
      id: 'critic',
      type: AutoGenAgentType.CRITIC,
      name: 'Critic',
      description: 'Evaluates plans, solutions, and execution results to ensure quality and correctness',
      capabilities: ['Evaluation', 'Error detection', 'Quality assessment', 'Suggestions'],
      systemPrompt: `You are a Critic agent responsible for evaluating plans, solutions, and execution results.
Your primary responsibilities are:
1. Review plans for completeness, efficiency, and effectiveness
2. Identify potential issues, edge cases, or errors in proposed solutions
3. Suggest improvements to enhance the quality of the solution
4. Verify that the final solution fully addresses the original task`
    };
    
    // Add these core agents
    this.agents.push(assistantAgent, userProxyAgent, criticAgent);
    
    // Add specialized agents based on task requirements
    if (this.includeCodeExecutor) {
      // Code Executor Agent
      const codeExecutorAgent: AutoGenAgent = {
        id: 'code_executor',
        type: AutoGenAgentType.CODE_EXECUTOR,
        name: 'CodeExecutor',
        description: 'Specializes in writing, editing, and executing code to solve problems',
        capabilities: ['Code generation', 'Code execution', 'Debugging', 'Testing'],
        systemPrompt: `You are a Code Executor agent specialized in writing, testing, and debugging code.
Your primary responsibilities are:
1. Write clean, efficient, and well-documented code to solve problems
2. Execute code and interpret results
3. Debug errors and propose fixes
4. Test code to ensure it works as expected
When writing code, always consider edge cases, performance, and maintainability.`
      };
      
      this.agents.push(codeExecutorAgent);
    }
    
    // Planner Agent
    const plannerAgent: AutoGenAgent = {
      id: 'planner',
      type: AutoGenAgentType.PLANNER,
      name: 'Planner',
      description: 'Creates structured plans for solving complex tasks',
      capabilities: ['Task decomposition', 'Planning', 'Sequencing', 'Resource allocation'],
      systemPrompt: `You are a Planner agent responsible for creating structured plans to solve complex tasks.
Your primary responsibilities are:
1. Break down complex tasks into manageable subtasks
2. Determine the optimal sequence of steps
3. Identify required resources and tools for each step
4. Adapt the plan based on feedback and changing circumstances
Always create clear, step-by-step plans with specific actions for each agent.`
    };
    
    this.agents.push(plannerAgent);
    
    // If the task involves information retrieval, add a Retriever agent
    if (this.taskInvolvesInformationRetrieval(task)) {
      const retrieverAgent: AutoGenAgent = {
        id: 'retriever',
        type: AutoGenAgentType.RETRIEVER,
        name: 'Retriever',
        description: 'Specialized in finding and retrieving relevant information',
        capabilities: ['Information search', 'Data extraction', 'Summarization', 'Knowledge integration'],
        systemPrompt: `You are a Retriever agent specialized in finding and retrieving relevant information.
Your primary responsibilities are:
1. Search for specific information needed to solve the task
2. Extract relevant data from various sources
3. Summarize information in a clear and concise manner
4. Integrate knowledge from multiple sources
Always cite your sources and provide context for the information you retrieve.`
      };
      
      this.agents.push(retrieverAgent);
    }
    
    // Set initiator and current speaker
    this.conversation.initiator = 'user_proxy';
    this.conversation.currentSpeaker = 'planner';
    
    // Add the initial task message
    this.addMessage({
      from: 'user_proxy',
      to: 'planner',
      content: `I need help with the following task: ${task}`,
      timestamp: new Date().toISOString(),
      type: 'text'
    });
  }

  /**
   * Check if a task requires code execution
   */
  private taskRequiresCodeExecution(task: string): boolean {
    const codeKeywords = [
      'code', 'program', 'script', 'algorithm', 'function', 'automate',
      'develop', 'implement', 'programming', 'software', 'application',
      'python', 'javascript', 'java', 'html', 'css', 'api'
    ];
    
    return codeKeywords.some(keyword => task.toLowerCase().includes(keyword));
  }

  /**
   * Check if a task involves information retrieval
   */
  private taskInvolvesInformationRetrieval(task: string): boolean {
    const retrievalKeywords = [
      'find', 'search', 'lookup', 'research', 'retrieve', 'information',
      'data', 'knowledge', 'article', 'paper', 'document', 'source',
      'reference', 'report', 'statistics', 'facts', 'details'
    ];
    
    return retrievalKeywords.some(keyword => task.toLowerCase().includes(keyword));
  }

  /**
   * Run the planning phase
   */
  private async runPlanningPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get the planner agent
    const planner = this.agents.find(a => a.type === AutoGenAgentType.PLANNER);
    if (!planner) {
      throw new Error('Planner agent not found');
    }
    
    // Generate the planner's response
    const plannerResponse = await this.generateAgentResponse(planner, options);
    
    // Add the message to the conversation
    this.addMessage({
      from: planner.id,
      to: 'assistant',
      content: plannerResponse,
      timestamp: new Date().toISOString(),
      type: 'text'
    });
    
    // Extract the plan from the response
    const plan = this.extractPlanFromResponse(plannerResponse);
    
    // Update task state with the plan
    this.conversation.taskState.currentPlan = plan;
    this.conversation.taskState.currentStep = 0;
    this.conversation.taskState.status = 'in_progress';
    
    // Get feedback on the plan from the critic
    await this.getCriticFeedbackOnPlan(options);
  }

  /**
   * Extract a plan from the planner's response
   */
  private extractPlanFromResponse(response: string): string[] {
    // Look for a numbered or bulleted list in the response
    const planRegex = /(\d+\.\s+.+?(?=\n\d+\.|$)|\n\s*-\s+.+?(?=\n\s*-|$))/g;
    const planMatches = response.match(planRegex);
    
    if (planMatches && planMatches.length > 0) {
      // Clean up the plan steps
      return planMatches.map(step => 
        step.replace(/^\d+\.\s+|-\s+/, '').trim()
      );
    }
    
    // Fallback: split by newlines and filter out empty lines
    const lines = response.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('#'));
    
    return lines;
  }

  /**
   * Get critic feedback on the plan
   */
  private async getCriticFeedbackOnPlan(options: ProtocolExecutionOptions): Promise<void> {
    // Get the critic agent
    const critic = this.agents.find(a => a.type === AutoGenAgentType.CRITIC);
    if (!critic) {
      throw new Error('Critic agent not found');
    }
    
    // Update current speaker
    this.conversation.currentSpeaker = critic.id;
    
    // Generate the critic's response
    const criticResponse = await this.generateAgentResponse(critic, options);
    
    // Add the message to the conversation
    this.addMessage({
      from: critic.id,
      to: 'assistant',
      content: criticResponse,
      timestamp: new Date().toISOString(),
      type: 'feedback'
    });
    
    // Update the plan if necessary based on critic feedback
    if (this.shouldUpdatePlan(criticResponse)) {
      // Get the planner to revise the plan
      this.conversation.currentSpeaker = 'planner';
      
      const planner = this.agents.find(a => a.type === AutoGenAgentType.PLANNER);
      if (!planner) {
        throw new Error('Planner agent not found');
      }
      
      // Generate the revised plan
      const revisedPlanResponse = await this.generateAgentResponse(planner, options);
      
      // Add the message to the conversation
      this.addMessage({
        from: planner.id,
        to: 'assistant',
        content: revisedPlanResponse,
        timestamp: new Date().toISOString(),
        type: 'text'
      });
      
      // Extract the revised plan
      const revisedPlan = this.extractPlanFromResponse(revisedPlanResponse);
      
      // Update task state with the revised plan
      this.conversation.taskState.currentPlan = revisedPlan;
    }
    
    // Set assistant as the next speaker to start execution
    this.conversation.currentSpeaker = 'assistant';
  }

  /**
   * Check if the plan should be updated based on critic feedback
   */
  private shouldUpdatePlan(criticResponse: string): boolean {
    // Look for indicators that the plan needs revision
    const revisionIndicators = [
      'revise', 'update', 'change', 'modify', 'improve',
      'issues', 'problems', 'concerns', 'missing', 'incomplete',
      'suggest', 'recommend', 'better approach', 'alternative'
    ];
    
    const lowercaseResponse = criticResponse.toLowerCase();
    
    // Check if any revision indicators are present
    for (const indicator of revisionIndicators) {
      if (lowercaseResponse.includes(indicator)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Run the execution phase
   */
  private async runExecutionPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get the assistant and user proxy agents
    const assistant = this.agents.find(a => a.type === AutoGenAgentType.ASSISTANT);
    const userProxy = this.agents.find(a => a.type === AutoGenAgentType.USER_PROXY);
    const codeExecutor = this.agents.find(a => a.type === AutoGenAgentType.CODE_EXECUTOR);
    
    if (!assistant || !userProxy) {
      throw new Error('Required agents not found');
    }
    
    // Maximum number of execution steps to prevent infinite loops
    const maxSteps = 15;
    let currentStep = 0;
    
    // Execute each step of the plan
    while (currentStep < maxSteps && 
           this.conversation.taskState.status === 'in_progress' &&
           this.conversation.taskState.currentStep !== undefined &&
           this.conversation.taskState.currentStep < (this.conversation.taskState.currentPlan?.length || 0)) {
      
      // Get the current step number
      const stepNumber = this.conversation.taskState.currentStep;
      
      // Get the current step from the plan
      const currentStepDescription = this.conversation.taskState.currentPlan![stepNumber];
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Execution Step ${stepNumber + 1}`,
          description: currentStepDescription,
          status: 'started'
        });
      }
      
      // Determine which agent should handle this step
      let executingAgent = assistant;
      
      // If the step involves code and we have a code executor agent, use it
      if (this.stepInvolvesCode(currentStepDescription) && codeExecutor) {
        executingAgent = codeExecutor;
      }
      
      // Set the current speaker
      this.conversation.currentSpeaker = executingAgent.id;
      
      // Generate the agent's response
      const executingAgentResponse = await this.generateAgentResponse(executingAgent, options);
      
      // Add the message to the conversation
      this.addMessage({
        from: executingAgent.id,
        to: 'user_proxy',
        content: executingAgentResponse,
        timestamp: new Date().toISOString(),
        type: this.determineMessageType(executingAgentResponse)
      });
      
      // Process tool usage if needed
      if (this.requestsToolExecution(executingAgentResponse)) {
        await this.handleToolExecution(executingAgentResponse, userProxy, options);
      }
      
      // Check if the step is completed
      if (this.isStepCompleted(executingAgentResponse)) {
        // Increment the step counter
        this.conversation.taskState.currentStep++;
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Execution Step ${stepNumber + 1}`,
            description: currentStepDescription,
            status: 'completed'
          });
        }
      }
      
      // Check if the task is completed
      if (this.conversation.taskState.currentStep >= (this.conversation.taskState.currentPlan?.length || 0)) {
        this.conversation.taskState.status = 'completed';
        break;
      }
      
      // Increment loop counter
      currentStep++;
    }
    
    // If we've reached max steps but task is not complete, mark as failed
    if (currentStep >= maxSteps && this.conversation.taskState.status !== 'completed') {
      this.conversation.taskState.status = 'failed';
      this.conversation.taskState.error = 'Exceeded maximum number of execution steps';
    }
  }

  /**
   * Check if a step involves code
   */
  private stepInvolvesCode(stepDescription: string): boolean {
    const codeKeywords = [
      'code', 'program', 'script', 'algorithm', 'function', 
      'implement', 'develop', 'write', 'compile', 'execute',
      'python', 'javascript', 'java', 'html', 'css'
    ];
    
    return codeKeywords.some(keyword => stepDescription.toLowerCase().includes(keyword));
  }

  /**
   * Determine the type of message
   */
  private determineMessageType(message: string): 'text' | 'code' | 'tool_request' {
    // Check for code blocks
    if (message.includes('```') || message.includes('```python') || message.includes('```javascript')) {
      return 'code';
    }
    
    // Check for tool requests
    if (this.requestsToolExecution(message)) {
      return 'tool_request';
    }
    
    // Default to text
    return 'text';
  }

  /**
   * Check if a message requests tool execution
   */
  private requestsToolExecution(message: string): boolean {
    // Check for explicit tool execution requests
    const toolRequestPatterns = [
      /use tool\s*:\s*(\w+)/i,
      /execute tool\s*:\s*(\w+)/i,
      /run tool\s*:\s*(\w+)/i,
      /I need to use the ([a-z_]+) tool/i,
      /please use the ([a-z_]+) tool/i
    ];
    
    for (const pattern of toolRequestPatterns) {
      if (pattern.test(message)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle tool execution
   */
  private async handleToolExecution(message: string, userProxy: AutoGenAgent, options: ProtocolExecutionOptions): Promise<void> {
    // Extract the tool name and parameters
    const toolInfo = this.extractToolInfo(message);
    
    if (!toolInfo) {
      // No valid tool request found
      return;
    }
    
    const { toolName, toolParams } = toolInfo;
    
    // Find the requested tool
    const tool = this.availableTools.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    
    if (!tool) {
      // Tool not found, add an error message from user proxy
      this.addMessage({
        from: userProxy.id,
        to: this.conversation.currentSpeaker,
        content: `Error: Tool "${toolName}" not found. Available tools are: ${this.availableTools.map(t => t.name).join(', ')}`,
        timestamp: new Date().toISOString(),
        type: 'text'
      });
      return;
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
      
      // Add a tool response message from user proxy
      this.addMessage({
        from: userProxy.id,
        to: this.conversation.currentSpeaker,
        content: typeof toolResult === 'object' 
          ? `Tool Result:\n\`\`\`json\n${JSON.stringify(toolResult, null, 2)}\n\`\`\`\n` 
          : `Tool Result: ${toolResult}`,
        timestamp: new Date().toISOString(),
        type: 'tool_response',
        metadata: {
          tool: tool.name,
          params: toolParams,
          result: toolResult
        }
      });
    } catch (error) {
      // Handle tool execution error
      log(`Tool execution error: ${error}`, 'agent');
      
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolParams,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      // Add an error message from user proxy
      this.addMessage({
        from: userProxy.id,
        to: this.conversation.currentSpeaker,
        content: `Error executing tool "${tool.name}": ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
        type: 'text'
      });
    }
  }

  /**
   * Extract tool name and parameters from a message
   */
  private extractToolInfo(message: string): { toolName: string, toolParams: Record<string, any> } | null {
    // Look for tool name
    let toolName = '';
    const toolNamePatterns = [
      /use tool\s*:\s*(\w+)/i,
      /execute tool\s*:\s*(\w+)/i,
      /run tool\s*:\s*(\w+)/i,
      /I need to use the ([a-z_]+) tool/i,
      /please use the ([a-z_]+) tool/i
    ];
    
    for (const pattern of toolNamePatterns) {
      const match = pattern.exec(message);
      if (match) {
        toolName = match[1];
        break;
      }
    }
    
    if (!toolName) {
      return null;
    }
    
    // Look for JSON parameters
    let toolParams: Record<string, any> = {};
    const jsonMatch = message.match(/{[\s\S]*?}/);
    
    if (jsonMatch) {
      try {
        toolParams = JSON.parse(jsonMatch[0]);
      } catch (error) {
        // Failed to parse JSON, continue with empty params
        log(`Failed to parse tool parameters: ${error}`, 'agent');
      }
    }
    
    // If no JSON parameters found, try to extract key-value pairs
    if (Object.keys(toolParams).length === 0) {
      const paramPattern = /([a-z_]+)\s*[:=]\s*['"]?([^'"\n,]+)['"]?/gi;
      let match;
      
      while ((match = paramPattern.exec(message)) !== null) {
        const [_, key, value] = match;
        toolParams[key.trim()] = value.trim();
      }
    }
    
    return { toolName, toolParams };
  }

  /**
   * Check if a step is completed
   */
  private isStepCompleted(message: string): boolean {
    // Look for step completion indicators
    const completionIndicators = [
      'step completed',
      'task completed',
      'finished',
      'done',
      'completed successfully',
      'step is now complete',
      'moving to the next step'
    ];
    
    return completionIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Run the critique phase
   */
  private async runCritiquePhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get the critic agent
    const critic = this.agents.find(a => a.type === AutoGenAgentType.CRITIC);
    if (!critic) {
      throw new Error('Critic agent not found');
    }
    
    // Update current speaker
    this.conversation.currentSpeaker = critic.id;
    
    // Generate the critic's review
    const criticReview = await this.generateAgentResponse(critic, options);
    
    // Add the message to the conversation
    this.addMessage({
      from: critic.id,
      to: 'assistant',
      content: criticReview,
      timestamp: new Date().toISOString(),
      type: 'feedback'
    });
    
    // If the critic identified significant issues that need fixing
    if (this.needsRefinement(criticReview)) {
      // Set assistant as the speaker for refinement
      this.conversation.currentSpeaker = 'assistant';
      
      const assistant = this.agents.find(a => a.type === AutoGenAgentType.ASSISTANT);
      if (!assistant) {
        throw new Error('Assistant agent not found');
      }
      
      // Generate refinement response
      const refinementResponse = await this.generateAgentResponse(assistant, options);
      
      // Add the refinement message
      this.addMessage({
        from: assistant.id,
        to: 'user_proxy',
        content: refinementResponse,
        timestamp: new Date().toISOString(),
        type: 'text'
      });
    }
  }

  /**
   * Check if refinement is needed based on critic review
   */
  private needsRefinement(criticReview: string): boolean {
    // Look for indicators that refinement is needed
    const refinementIndicators = [
      'needs improvement',
      'refinement needed',
      'issues found',
      'problems with',
      'missing',
      'incorrect',
      'errors',
      'failed to',
      'didn\'t address',
      'incomplete'
    ];
    
    return refinementIndicators.some(indicator => 
      criticReview.toLowerCase().includes(indicator)
    );
  }

  /**
   * Generate a response from an agent
   */
  private async generateAgentResponse(agent: AutoGenAgent, options: ProtocolExecutionOptions): Promise<string> {
    // Create the prompt for the agent
    const prompt = this.createAgentPrompt(agent);
    
    // Get response from the LLM
    const response = await this.getResponseFromLLM(prompt);
    
    return response;
  }

  /**
   * Create a prompt for an agent
   */
  private createAgentPrompt(agent: AutoGenAgent): string {
    let prompt = `${agent.systemPrompt}\n\n`;
    
    // Add task context
    const taskMessage = this.conversation.messages.find(m => m.from === 'user_proxy' && m.to === 'planner');
    
    if (taskMessage) {
      prompt += `Task: ${taskMessage.content.replace('I need help with the following task: ', '')}\n\n`;
    }
    
    // Add current plan and step if available
    if (this.conversation.taskState.currentPlan && this.conversation.taskState.currentPlan.length > 0) {
      prompt += `Current Plan:\n`;
      
      this.conversation.taskState.currentPlan.forEach((step, idx) => {
        const stepStatus = idx < (this.conversation.taskState.currentStep || 0) 
          ? '✓' 
          : idx === (this.conversation.taskState.currentStep || 0) 
            ? '⟳' 
            : '○';
        
        prompt += `${stepStatus} Step ${idx + 1}: ${step}\n`;
      });
      
      prompt += `\n`;
      
      // Add current step details if available
      if (this.conversation.taskState.currentStep !== undefined) {
        const currentStepNumber = this.conversation.taskState.currentStep;
        const currentStep = this.conversation.taskState.currentPlan[currentStepNumber];
        
        if (currentStep) {
          prompt += `Current Step: ${currentStepNumber + 1}. ${currentStep}\n\n`;
        }
      }
    }
    
    // Add available tools if applicable
    if (this.availableTools.length > 0 && 
        (agent.type === AutoGenAgentType.ASSISTANT || agent.type === AutoGenAgentType.CODE_EXECUTOR)) {
      prompt += `Available Tools:\n`;
      
      this.availableTools.forEach(tool => {
        prompt += `- ${tool.name}: ${tool.description}\n`;
      });
      
      prompt += `\nTo use a tool, write "Use Tool: [tool name]" followed by the parameters as JSON.\n\n`;
    }
    
    // Add conversation history
    prompt += `Conversation History:\n`;
    
    // Filter to recent and relevant messages (limit to last 10 messages)
    const relevantMessages = this.getRelevantMessages(agent);
    
    relevantMessages.forEach(msg => {
      prompt += `${msg.from}: ${msg.content}\n\n`;
    });
    
    // Add specific instructions based on agent type
    switch (agent.type) {
      case AutoGenAgentType.PLANNER:
        prompt += `As the Planner, create a detailed step-by-step plan to accomplish this task. Each step should be clear and actionable.`;
        break;
      case AutoGenAgentType.CRITIC:
        if (this.conversation.taskState.status === 'in_progress') {
          prompt += `As the Critic, review the proposed plan and provide feedback on its completeness, efficiency, and effectiveness. Identify any potential issues or suggest improvements.`;
        } else {
          prompt += `As the Critic, review the execution of the task and provide feedback on the solution. Evaluate whether the task was completed successfully and if the solution fully addresses the requirements.`;
        }
        break;
      case AutoGenAgentType.ASSISTANT:
        prompt += `As the Assistant, work on the current step of the plan. You can use available tools if needed. When the step is complete, indicate this clearly.`;
        break;
      case AutoGenAgentType.CODE_EXECUTOR:
        prompt += `As the Code Executor, write code to accomplish the current step. Include comments to explain your approach. When finished, indicate the step is complete.`;
        break;
      default:
        prompt += `You are ${agent.name}. Generate your next response based on the conversation history and your role.`;
    }
    
    return prompt;
  }

  /**
   * Get relevant messages for an agent
   */
  private getRelevantMessages(agent: AutoGenAgent): AutoGenMessage[] {
    // Get all messages that involve this agent (either as sender or recipient)
    const agentMessages = this.conversation.messages.filter(m => 
      m.from === agent.id || m.to === agent.id
    );
    
    // If there are enough agent-specific messages, return those
    if (agentMessages.length >= 5) {
      return agentMessages.slice(-10);
    }
    
    // Otherwise, return the most recent messages
    return this.conversation.messages.slice(-10);
  }

  /**
   * Add a message to the conversation
   */
  private addMessage(message: AutoGenMessage): void {
    this.conversation.messages.push(message);
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(): string {
    let response = `# AutoGen Collaborative Task Execution\n\n`;
    
    // Task section
    const taskMessage = this.conversation.messages.find(m => m.from === 'user_proxy' && m.to === 'planner');
    if (taskMessage) {
      response += `## Task\n${taskMessage.content.replace('I need help with the following task: ', '')}\n\n`;
    }
    
    // Status section
    response += `## Execution Status\n`;
    response += `Status: ${this.conversation.taskState.status}\n`;
    
    if (this.conversation.taskState.error) {
      response += `Error: ${this.conversation.taskState.error}\n`;
    }
    
    // Agents section
    response += `\n## Participating Agents\n`;
    this.agents.forEach(agent => {
      response += `- **${agent.name}** (${agent.type}): ${agent.description}\n`;
    });
    
    // Plan section
    if (this.conversation.taskState.currentPlan) {
      response += `\n## Execution Plan\n`;
      
      this.conversation.taskState.currentPlan.forEach((step, idx) => {
        const stepStatus = idx < (this.conversation.taskState.currentStep || 0) 
          ? '✓' 
          : idx === (this.conversation.taskState.currentStep || 0) 
            ? '⟳' 
            : '○';
        
        response += `${stepStatus} Step ${idx + 1}: ${step}\n`;
      });
    }
    
    // Results section
    response += `\n## Results\n`;
    
    if (this.conversation.taskState.status === 'completed') {
      // Extract final solution from the conversation
      const solution = this.extractFinalSolution();
      if (solution) {
        response += solution;
      } else {
        response += `Task completed successfully.\n`;
      }
    } else if (this.conversation.taskState.status === 'failed') {
      response += `Task execution failed: ${this.conversation.taskState.error || 'Unknown error'}\n`;
    } else {
      response += `Task execution is still in progress.\n`;
    }
    
    // Critic feedback section
    const criticMessages = this.conversation.messages.filter(m => 
      m.from === 'critic' && m.type === 'feedback'
    );
    
    if (criticMessages.length > 0) {
      response += `\n## Critic Feedback\n`;
      response += criticMessages[criticMessages.length - 1].content;
    }
    
    return response;
  }

  /**
   * Extract the final solution from the conversation
   */
  private extractFinalSolution(): string | null {
    // Look for messages at the end of the conversation that might contain the solution
    const recentMessages = this.conversation.messages.slice(-5);
    
    // Find the most recent message from assistant or code_executor after the task was completed
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      if ((msg.from === 'assistant' || msg.from === 'code_executor') && 
          (msg.content.toLowerCase().includes('solution') || 
           msg.content.toLowerCase().includes('result') || 
           msg.content.toLowerCase().includes('final') || 
           msg.content.toLowerCase().includes('output'))) {
        return msg.content;
      }
    }
    
    return null;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // Extract tool calls from the conversation
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    // Find tool requests and their responses
    for (let i = 0; i < this.conversation.messages.length - 1; i++) {
      const msg = this.conversation.messages[i];
      const nextMsg = this.conversation.messages[i + 1];
      
      if (msg.type === 'tool_request' && nextMsg.type === 'tool_response' && nextMsg.metadata) {
        toolCalls.push({
          name: nextMsg.metadata.tool,
          input: nextMsg.metadata.params,
          output: nextMsg.metadata.result
        });
      }
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
    // Reset AutoGen state
    this.agents = [];
    this.conversation = {
      messages: [],
      currentSpeaker: '',
      initiator: '',
      taskState: {
        status: 'started'
      }
    };
    this.includeCodeExecutor = false;
    this.initialized = false;
    
    return Promise.resolve();
  }
}