/**
 * SmolAgents Protocol Implementation
 * 
 * Implements HuggingFace's SmolAgents protocol for tiny, lightweight MCP-embedded agents.
 * Focuses on minimal resource usage and efficient agent architecture.
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

// SmolAgent types
enum SmolAgentType {
  ROUTER = 'router',
  EXECUTOR = 'executor',
  PLANNER = 'planner',
  RESEARCHER = 'researcher',
  MEMORY = 'memory'
}

// SmolAgent definition
interface SmolAgent {
  id: string;
  type: SmolAgentType;
  name: string;
  systemPrompt: string;
  context: string;
  memory: string[];
  maxContextSize: number;
}

// Execution step
interface ExecutionStep {
  agentId: string;
  input: string;
  output: string;
  timestamp: string;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, any>;
    output: any;
  }>;
}

export class SmolAgentsProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are SmolAgents, a protocol for tiny, lightweight MCP-embedded agents developed by HuggingFace. 
Your architecture specializes in:
1. Minimal resource usage with tiny specialized agents
2. Efficient context management to maximize usable context
3. Modular agent design with specific responsibilities
4. MCP (Memory, Context, Planning) embedding strategy
5. Task-specific execution with minimal overhead`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.COLLABORATION,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.MULTI_STEP
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // SmolAgents state
  private agents: SmolAgent[] = [];
  private executionSteps: ExecutionStep[] = [];
  private currentAgentId: string = '';
  private taskDescription: string = '';
  private taskStatus: 'started' | 'in_progress' | 'completed' | 'failed' = 'started';
  private maxTokenBudget: number = 8000; // Maximum tokens to use across all agents (for smol efficiency)
  private executionPlan: string[] = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'SmolAgents',
      version: '1.0.0',
      description: 'Tiny, lightweight MCP-embedded agents (HuggingFace)',
      capabilities: [
        ProtocolCapabilities.COLLABORATION,
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
    
    // Reset SmolAgents state
    this.agents = [];
    this.executionSteps = [];
    this.currentAgentId = '';
    this.taskDescription = '';
    this.taskStatus = 'started';
    this.executionPlan = [];
    
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

      // Store the task description
      this.taskDescription = options.task;

      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'SmolAgents Initialization',
          description: 'Creating specialized smol agents for the task',
          status: 'started'
        });
      }

      // Step 1: Create and initialize SmolAgents
      this.initializeAgents(options.task);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'SmolAgents Initialization',
          description: 'Created specialized agents',
          output: { agentCount: this.agents.length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Planning',
          description: 'Planning task execution with minimal steps',
          status: 'started'
        });
      }

      // Step 2: Planning phase - Create execution plan
      await this.createExecutionPlan(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Planning',
          description: 'Execution plan created',
          output: { steps: this.executionPlan.length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Execution',
          description: 'Executing task with minimal resource usage',
          status: 'started'
        });
      }

      // Step 3: Execution phase - Run the task
      await this.executeTask(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Execution',
          description: 'Task execution completed',
          output: { 
            status: this.taskStatus,
            steps: this.executionSteps.length
          },
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.generateFinalResponse();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'smolagents',
        metadata: {
          agentCount: this.agents.length,
          executionSteps: this.executionSteps.length,
          tokenBudget: this.maxTokenBudget,
          status: this.taskStatus
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`SmolAgents Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Initialize agents for the task
   */
  private initializeAgents(task: string): void {
    // 1. Router Agent - Directs task flow between agents
    const routerAgent: SmolAgent = {
      id: 'router',
      type: SmolAgentType.ROUTER,
      name: 'RouterAgent',
      systemPrompt: `You are a Router agent in a SmolAgents system. Your job is to:
1. Analyze incoming tasks and determine which specialized agent should handle them
2. Parse outputs from agents and decide next steps
3. Maintain minimal context by only passing essential information
4. Sequence agent calls in the most efficient order
5. Track overall task progress
Be extremely concise in your responses. Use minimal tokens.`,
      context: `Task: ${task}`,
      memory: [],
      maxContextSize: 1000
    };
    
    // 2. Planner Agent - Creates minimal execution plans
    const plannerAgent: SmolAgent = {
      id: 'planner',
      type: SmolAgentType.PLANNER,
      name: 'PlannerAgent',
      systemPrompt: `You are a Planner agent in a SmolAgents system. Your job is to:
1. Break down tasks into minimal, necessary steps
2. Create execution plans that use the fewest steps possible
3. Specify which agent should handle each step
4. Ensure steps are specific and actionable
5. Adapt plans based on execution feedback
Be extremely concise. Waste no tokens on explanations - just create the plan.`,
      context: `Task: ${task}`,
      memory: [],
      maxContextSize: 1500
    };
    
    // 3. Executor Agent - Executes steps and uses tools
    const executorAgent: SmolAgent = {
      id: 'executor',
      type: SmolAgentType.EXECUTOR,
      name: 'ExecutorAgent',
      systemPrompt: `You are an Executor agent in a SmolAgents system. Your job is to:
1. Execute specific steps from a plan
2. Use tools efficiently to accomplish tasks
3. Return only essential results
4. Handle errors gracefully with minimal retry attempts
5. Focus on action over deliberation
Be extremely concise. Use tools precisely and return minimal output.`,
      context: `Task: ${task}`,
      memory: [],
      maxContextSize: 2000
    };
    
    // 4. Memory Agent - Stores and retrieves key information
    const memoryAgent: SmolAgent = {
      id: 'memory',
      type: SmolAgentType.MEMORY,
      name: 'MemoryAgent',
      systemPrompt: `You are a Memory agent in a SmolAgents system. Your job is to:
1. Store key facts, findings, and outputs from other agents
2. Retrieve relevant information when requested
3. Compress information to minimal necessary tokens
4. Maintain context across multiple execution steps
5. Prioritize important information
Use extreme compression - only store essential details in your responses.`,
      context: `Task: ${task}`,
      memory: [],
      maxContextSize: 1500
    };
    
    // Add these core agents
    this.agents.push(routerAgent, plannerAgent, executorAgent, memoryAgent);
    
    // 5. Researcher Agent (add only if the task requires research)
    if (this.taskRequiresResearch(task)) {
      const researcherAgent: SmolAgent = {
        id: 'researcher',
        type: SmolAgentType.RESEARCHER,
        name: 'ResearcherAgent',
        systemPrompt: `You are a Researcher agent in a SmolAgents system. Your job is to:
1. Find specific information needed for a task
2. Extract only the most relevant details
3. Summarize findings in minimal tokens
4. Use search and retrieval tools efficiently
5. Verify information quality
Be extremely concise. Return only essential information.`,
        context: `Task: ${task}`,
        memory: [],
        maxContextSize: 2000
      };
      
      this.agents.push(researcherAgent);
    }
    
    // Set initial router agent as current
    this.currentAgentId = 'router';
  }

  /**
   * Check if a task requires research
   */
  private taskRequiresResearch(task: string): boolean {
    const researchKeywords = [
      'research', 'find', 'search', 'information', 'data',
      'look up', 'investigate', 'facts', 'details', 'learn about'
    ];
    
    return researchKeywords.some(keyword => task.toLowerCase().includes(keyword));
  }

  /**
   * Create the execution plan
   */
  private async createExecutionPlan(options: ProtocolExecutionOptions): Promise<void> {
    // Get the planner agent
    const planner = this.getAgentById('planner');
    if (!planner) {
      throw new Error('Planner agent not found');
    }
    
    // Create the planner prompt
    const plannerPrompt = `Create a minimal execution plan for this task:
${this.taskDescription}

Available agents:
- router: Routes tasks between agents
- executor: Executes specific steps and uses tools
- memory: Stores and retrieves key information
${this.agents.some(a => a.id === 'researcher') ? '- researcher: Finds information and summarizes findings' : ''}

Available tools:
${this.availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Create a step-by-step plan with at most 5 steps. Each step should specify:
1. The agent to use
2. The exact action to take
3. Any tools needed

Format your plan as a numbered list:
1. [agent] - action
2. [agent] - action
...

Your plan must be minimal and eliminate unnecessary steps.`;

    // Get planner response
    const plannerResponse = await this.getAgentResponse(planner, plannerPrompt, options);
    
    // Extract the plan steps
    this.executionPlan = this.extractPlanSteps(plannerResponse);
    
    // Add to execution steps
    this.addExecutionStep('planner', plannerPrompt, plannerResponse);
    
    // Update task status
    this.taskStatus = 'in_progress';
  }

  /**
   * Extract plan steps from planner response
   */
  private extractPlanSteps(plannerResponse: string): string[] {
    // Look for numbered list items (1. [agent] - action)
    const stepRegex = /\d+\.\s*\[(\w+)\]\s*-\s*(.+?)(?=\n\d+\.|\n\n|$)/gs;
    const steps: string[] = [];
    let match;
    
    while ((match = stepRegex.exec(plannerResponse)) !== null) {
      // Format as: [agent] action
      steps.push(`[${match[1]}] ${match[2].trim()}`);
    }
    
    // If no numbered list found, try parsing line by line
    if (steps.length === 0) {
      const lines = plannerResponse.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      for (const line of lines) {
        // Look for [agent] pattern
        const agentMatch = line.match(/\[(\w+)\]/);
        if (agentMatch) {
          steps.push(line);
        }
      }
    }
    
    return steps;
  }

  /**
   * Execute the task according to the plan
   */
  private async executeTask(options: ProtocolExecutionOptions): Promise<void> {
    // Maximum number of steps to prevent infinite loops
    const maxSteps = 10;
    let stepCount = 0;
    
    // Follow the execution plan
    for (let i = 0; i < this.executionPlan.length && stepCount < maxSteps; i++) {
      const planStep = this.executionPlan[i];
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Execution Step ${i + 1}`,
          description: planStep,
          status: 'started'
        });
      }
      
      // Parse the agent and action from the plan step
      const agentMatch = planStep.match(/\[(\w+)\]/);
      if (!agentMatch) {
        log(`Invalid plan step format: ${planStep}`, 'agent');
        continue;
      }
      
      const agentId = agentMatch[1];
      const action = planStep.replace(/\[\w+\]\s*/, '').trim();
      
      // Get the agent
      const agent = this.getAgentById(agentId);
      if (!agent) {
        log(`Agent not found: ${agentId}`, 'agent');
        continue;
      }
      
      // Set current agent
      this.currentAgentId = agentId;
      
      // Create agent prompt
      const agentPrompt = this.createAgentPrompt(agent, action);
      
      // Get agent response
      const agentResponse = await this.getAgentResponse(agent, agentPrompt, options);
      
      // Process tool usage if needed
      let toolResults: Record<string, any> | undefined;
      if (this.containsToolRequest(agentResponse) && agent.type === SmolAgentType.EXECUTOR) {
        toolResults = await this.processToolRequests(agentResponse, options);
      }
      
      // Add to execution steps
      this.addExecutionStep(agentId, agentPrompt, agentResponse, toolResults);
      
      // Store important information in memory agent
      if (agent.type !== SmolAgentType.MEMORY) {
        await this.updateMemoryAgent(agentResponse, options);
      }
      
      // Update the agent's memory
      this.updateAgentMemory(agent, agentResponse);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Execution Step ${i + 1}`,
          description: planStep,
          output: toolResults || { response: this.truncateResponse(agentResponse, 100) },
          status: 'completed'
        });
      }
      
      // Check if the task is completed
      if (this.isTaskCompleted(agentResponse)) {
        this.taskStatus = 'completed';
        break;
      }
      
      stepCount++;
    }
    
    // If max steps reached but task not completed
    if (stepCount >= maxSteps && this.taskStatus !== 'completed') {
      this.taskStatus = 'failed';
      log(`Exceeded maximum number of steps: ${maxSteps}`, 'agent');
    }
  }

  /**
   * Create a prompt for an agent
   */
  private createAgentPrompt(agent: SmolAgent, action: string): string {
    let prompt = `${agent.systemPrompt}\n\n`;
    
    // Add context
    prompt += `${agent.context}\n\n`;
    
    // Add action
    prompt += `Current action: ${action}\n\n`;
    
    // Add memory if available
    if (agent.memory.length > 0) {
      prompt += `Agent memory (most recent):\n`;
      // Only include most recent memories to stay within token budget
      const recentMemories = agent.memory.slice(-3);
      for (const memory of recentMemories) {
        prompt += `- ${memory}\n`;
      }
      prompt += `\n`;
    }
    
    // Add specific instructions based on agent type
    switch (agent.type) {
      case SmolAgentType.ROUTER:
        prompt += `Route this action to the appropriate agent or determine next steps. Be extremely concise.`;
        break;
      case SmolAgentType.PLANNER:
        prompt += `Plan how to execute this action in minimal steps. Be extremely concise.`;
        break;
      case SmolAgentType.EXECUTOR:
        // Add available tools if this is the executor agent
        if (this.availableTools.length > 0) {
          prompt += `Available tools:\n`;
          for (const tool of this.availableTools) {
            prompt += `- ${tool.name}: ${tool.description}\n`;
          }
          prompt += `\nTo use a tool, respond with: USE TOOL: [tool name] with parameters: [parameters]\n\n`;
        }
        prompt += `Execute this action efficiently. Return only essential results.`;
        break;
      case SmolAgentType.MEMORY:
        prompt += `Store or retrieve information related to this action. Use extreme compression.`;
        break;
      case SmolAgentType.RESEARCHER:
        prompt += `Find information needed for this action. Summarize findings in minimal tokens.`;
        break;
    }
    
    // Add token budget reminder
    prompt += `\n\nMAXIMUM TOKEN BUDGET: Use as few tokens as possible in your response.`;
    
    return prompt;
  }

  /**
   * Get a response from an agent
   */
  private async getAgentResponse(agent: SmolAgent, prompt: string, options: ProtocolExecutionOptions): Promise<string> {
    // Calculate a token budget for this agent
    const tokenLimit = Math.min(agent.maxContextSize, this.config.maxTokens || 1024);
    
    // Get response from LLM with the agent's token budget
    const response = await this.getResponseFromLLM(prompt, tokenLimit);
    
    return response;
  }

  /**
   * Add an execution step to the history
   */
  private addExecutionStep(
    agentId: string, 
    input: string, 
    output: string, 
    toolCalls?: Record<string, any>
  ): void {
    this.executionSteps.push({
      agentId,
      input,
      output,
      timestamp: new Date().toISOString(),
      toolCalls: toolCalls ? [toolCalls] : undefined
    });
  }

  /**
   * Update the memory agent with important information
   */
  private async updateMemoryAgent(information: string, options: ProtocolExecutionOptions): Promise<void> {
    // Get the memory agent
    const memoryAgent = this.getAgentById('memory');
    if (!memoryAgent) {
      return;
    }
    
    // Create memory update prompt
    const memoryPrompt = `Update memory with this new information:
${information}

Extract ONLY key facts and findings. Use extreme compression.
Respond with a bullet list of key points in 50 words or less:`;
    
    // Get memory agent response
    const memoryResponse = await this.getAgentResponse(memoryAgent, memoryPrompt, options);
    
    // Update memory agent's context with compressed information
    memoryAgent.context += `\nMemory update at ${new Date().toISOString()}:\n${memoryResponse}`;
    
    // Add to execution steps
    this.addExecutionStep('memory', memoryPrompt, memoryResponse);
  }

  /**
   * Update an agent's memory with its recent response
   */
  private updateAgentMemory(agent: SmolAgent, response: string): void {
    // Create a compressed memory entry
    const memoryEntry = this.truncateResponse(response, 200);
    
    // Add to agent's memory
    agent.memory.push(memoryEntry);
    
    // Maintain maximum memory size (keep only 5 most recent memories)
    if (agent.memory.length > 5) {
      agent.memory = agent.memory.slice(-5);
    }
  }

  /**
   * Check if a response contains a tool request
   */
  private containsToolRequest(response: string): boolean {
    return response.includes('USE TOOL:') || response.includes('USE_TOOL:') || response.includes('TOOL:');
  }

  /**
   * Process tool requests in the response
   */
  private async processToolRequests(response: string, options: ProtocolExecutionOptions): Promise<Record<string, any> | undefined> {
    // Extract tool requests
    const toolRegex = /(?:USE TOOL|USE_TOOL|TOOL):\s*(\w+)(?:\s+with parameters:|\s+params:|\s+with:)\s*(.+?)(?=\n\n|$)/s;
    const match = toolRegex.exec(response);
    
    if (!match) {
      return undefined;
    }
    
    const toolName = match[1];
    const parametersText = match[2];
    
    // Find the tool
    const tool = this.availableTools.find(t => t.name.toLowerCase() === toolName.toLowerCase());
    if (!tool) {
      return { error: `Tool ${toolName} not found` };
    }
    
    // Parse parameters
    let parameters: Record<string, any> = {};
    
    try {
      // Try parsing as JSON first
      if (parametersText.trim().startsWith('{')) {
        parameters = JSON.parse(parametersText);
      } else {
        // Parse as key-value pairs
        parametersText.split(',').forEach(pair => {
          const [key, value] = pair.split(':').map(s => s.trim());
          if (key && value) {
            parameters[key] = this.parseValue(value);
          }
        });
      }
    } catch (error) {
      log(`Error parsing tool parameters: ${error}`, 'agent');
      return { error: `Failed to parse parameters: ${(error as Error).message}` };
    }
    
    try {
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: parameters,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      const result = await tool.execute(parameters);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: parameters,
          output: result,
          error: undefined
        });
      }
      
      return {
        tool: toolName,
        input: parameters,
        output: result
      };
    } catch (error) {
      log(`Error executing tool ${toolName}: ${error}`, 'agent');
      
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: parameters,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      return {
        tool: toolName,
        input: parameters,
        error: (error as Error).message
      };
    }
  }

  /**
   * Parse a string value to the appropriate type
   */
  private parseValue(value: string): any {
    // Remove quotes
    value = value.replace(/^["']|["']$/g, '');
    
    // Try to parse as number
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return Number(value);
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Return as string
    return value;
  }

  /**
   * Check if the task is completed
   */
  private isTaskCompleted(response: string): boolean {
    const completionIndicators = [
      'task completed',
      'task is complete',
      'finished task',
      'task finished',
      'task accomplished',
      'successfully completed',
      'TASK_COMPLETE',
      'TASK_FINISHED'
    ];
    
    return completionIndicators.some(indicator => 
      response.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  /**
   * Get an agent by ID
   */
  private getAgentById(id: string): SmolAgent | undefined {
    return this.agents.find(agent => agent.id === id);
  }

  /**
   * Truncate a response to a maximum length
   */
  private truncateResponse(response: string, maxLength: number): string {
    if (response.length <= maxLength) {
      return response;
    }
    
    // Truncate and add ellipsis
    return response.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate the final response
   */
  private generateFinalResponse(): string {
    let response = `# SmolAgents Task Execution Report\n\n`;
    
    // Task section
    response += `## Task\n${this.taskDescription}\n\n`;
    
    // Status section
    response += `## Status\n${this.taskStatus.toUpperCase()}\n\n`;
    
    // Agent utilization section
    response += `## Agent Utilization\n`;
    
    // Count agent usage
    const agentUsage = new Map<string, number>();
    for (const step of this.executionSteps) {
      agentUsage.set(step.agentId, (agentUsage.get(step.agentId) || 0) + 1);
    }
    
    // Display agent usage
    for (const agent of this.agents) {
      const usageCount = agentUsage.get(agent.id) || 0;
      response += `- ${agent.name}: ${usageCount} activations\n`;
    }
    
    // Extract final result
    response += `\n## Result\n`;
    
    if (this.taskStatus === 'completed') {
      // Look for the final result in the last few steps
      const finalSteps = this.executionSteps.slice(-3);
      
      // First check executor agent outputs
      const executorStep = finalSteps.find(step => step.agentId === 'executor');
      if (executorStep) {
        response += this.extractResultFromResponse(executorStep.output);
      } else {
        // Otherwise use the last step's output
        const lastStep = this.executionSteps[this.executionSteps.length - 1];
        response += this.extractResultFromResponse(lastStep.output);
      }
    } else if (this.taskStatus === 'failed') {
      response += `Task execution failed.\n`;
    } else {
      response += `Task execution incomplete.\n`;
    }
    
    // Execution summary section
    response += `\n## Execution Summary\n`;
    response += `- Total steps: ${this.executionSteps.length}\n`;
    
    // Count tool usage
    const toolUsage = new Map<string, number>();
    for (const step of this.executionSteps) {
      if (step.toolCalls) {
        for (const toolCall of step.toolCalls) {
          toolUsage.set(toolCall.tool, (toolUsage.get(toolCall.tool) || 0) + 1);
        }
      }
    }
    
    // Display tool usage if any
    if (toolUsage.size > 0) {
      response += `- Tools used:\n`;
      for (const [tool, count] of toolUsage.entries()) {
        response += `  - ${tool}: ${count} calls\n`;
      }
    }
    
    return response;
  }

  /**
   * Extract result from a response
   */
  private extractResultFromResponse(response: string): string {
    // Look for result sections
    const resultSectionPatterns = [
      /result:(.+?)(?=\n\n|$)/is,
      /final result:(.+?)(?=\n\n|$)/is,
      /answer:(.+?)(?=\n\n|$)/is,
      /conclusion:(.+?)(?=\n\n|$)/is
    ];
    
    for (const pattern of resultSectionPatterns) {
      const match = pattern.exec(response);
      if (match) {
        return match[1].trim();
      }
    }
    
    // If no specific result section, return the full response
    return response;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // Collect tool calls from execution steps
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    for (const step of this.executionSteps) {
      if (step.toolCalls) {
        for (const toolCall of step.toolCalls) {
          // Skip tool calls with errors
          if (!toolCall.error) {
            toolCalls.push({
              name: toolCall.tool,
              input: toolCall.input,
              output: toolCall.output
            });
          }
        }
      }
    }
    
    return toolCalls.length > 0 ? toolCalls : undefined;
  }

  /**
   * Get response from the appropriate LLM based on model name, with token limit
   */
  private async getResponseFromLLM(prompt: string, maxTokens: number = 1024): Promise<string> {
    try {
      if (this.config.modelName?.includes('claude')) {
        return await this.getResponseFromClaude(prompt, maxTokens);
      } else if (this.config.modelName?.includes('gpt')) {
        return await this.getResponseFromOpenAI(prompt, maxTokens);
      } else {
        // Default to Claude
        return await this.getResponseFromClaude(prompt, maxTokens);
      }
    } catch (error) {
      log(`Error getting LLM response: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Get response from Claude with token limit
   */
  private async getResponseFromClaude(prompt: string, maxTokens: number): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }
    
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.content[0].text;
  }

  /**
   * Get response from OpenAI with token limit
   */
  private async getResponseFromOpenAI(prompt: string, maxTokens: number): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.modelName as string,
      max_tokens: maxTokens,
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
    
    // Update max tokens if provided
    if (config.maxTokens) {
      this.maxTokenBudget = config.maxTokens;
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
    // Reset SmolAgents state
    this.agents = [];
    this.executionSteps = [];
    this.currentAgentId = '';
    this.taskDescription = '';
    this.taskStatus = 'started';
    this.executionPlan = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}