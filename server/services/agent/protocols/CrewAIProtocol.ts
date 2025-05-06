/**
 * CrewAI Protocol Implementation
 * 
 * Implements a protocol inspired by CrewAI for multi-role, goal-driven agent flows.
 * Supports collaborative problem-solving with specialized agent roles.
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

// Agent role in CrewAI
export interface CrewAIAgent {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  systemPrompt: string;
  tools?: string[]; // Names of tools this agent can use
  allowDelegation?: boolean; // Can delegate tasks to other agents
}

// Task in CrewAI
export interface CrewAITask {
  id: string;
  name: string;
  description: string;
  expectedOutput: string;
  assignedTo?: string; // Agent ID
  dependsOn?: string[]; // Task IDs
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

// Process type for CrewAI
export enum CrewAIProcessType {
  SEQUENTIAL = 'sequential', // Tasks executed in sequence
  HIERARCHICAL = 'hierarchical', // Manager delegates to workers
  CONSENSUS = 'consensus' // Agents must reach agreement
}

export class CrewAIProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are part of a collaborative crew of AI agents working together to solve complex problems.',
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.COLLABORATION,
      ProtocolCapabilities.ROLE_PLAYING
    ],
    processType: CrewAIProcessType.HIERARCHICAL,
    maxIterations: 10, // Maximum number of process iterations
    agents: [], // Will be populated in init()
    taskTimeout: 300000, // 5 minutes per task
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private agents: CrewAIAgent[] = [];
  private tasks: CrewAITask[] = [];
  private processLog: Array<{
    timestamp: Date;
    agent: string;
    action: string;
    details: any;
  }> = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'CrewAI',
      version: '1.0.0',
      description: 'Protocol for multi-role, goal-driven agent flows',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.COLLABORATION,
        ProtocolCapabilities.ROLE_PLAYING
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
    
    // Set up agents
    if (this.config.agents && Array.isArray(this.config.agents) && this.config.agents.length > 0) {
      this.agents = this.config.agents as CrewAIAgent[];
    } else {
      // Create default agents if none provided
      this.agents = this.createDefaultAgents();
    }
    
    // Reset execution state
    this.tasks = [];
    this.processLog = [];
    
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

      // Determine process to use based on configuration
      let result;
      switch (this.config.processType) {
        case CrewAIProcessType.SEQUENTIAL:
          result = await this.runSequentialProcess(options);
          break;
        case CrewAIProcessType.HIERARCHICAL:
          result = await this.runHierarchicalProcess(options);
          break;
        case CrewAIProcessType.CONSENSUS:
          result = await this.runConsensusProcess(options);
          break;
        default:
          // Default to hierarchical
          result = await this.runHierarchicalProcess(options);
      }
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: result.finalOutput,
        usedTools: result.toolExecutions,
        thinking: this.getProcessTranscript(),
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`CrewAI Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Run a sequential process where tasks are executed in order
   */
  private async runSequentialProcess(options: ProtocolExecutionOptions): Promise<{
    finalOutput: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    // Generate initial tasks
    await this.generateInitialTasks(options.task);
    
    // Log the initial task planning
    this.addToLog('Crew', 'planning', {
      message: 'Generated initial task plan',
      tasks: this.tasks.map(t => ({
        id: t.id,
        name: t.name,
        assignedTo: t.assignedTo
      }))
    });
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Task Planning',
        description: 'Generated initial tasks for sequential execution',
        output: this.tasks.map(t => t.name).join(', '),
        status: 'completed'
      });
    }
    
    const tools = options.tools || this.availableTools;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Execute tasks in sequence
    for (const task of this.tasks) {
      // Update task status
      task.status = 'in_progress';
      
      // Log task start
      this.addToLog(task.assignedTo || 'Crew', 'task_start', {
        taskId: task.id,
        taskName: task.name
      });
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task: ${task.name}`,
          description: task.description,
          status: 'started'
        });
      }
      
      try {
        // Find the assigned agent
        const agent = this.agents.find(a => a.id === task.assignedTo);
        
        if (!agent) {
          throw new Error(`Agent with ID ${task.assignedTo} not found for task ${task.id}`);
        }
        
        // Execute the task with the assigned agent
        const result = await this.executeTask(task, agent, tools, options);
        
        // Update task status and result
        task.status = 'completed';
        task.result = result.output;
        
        // Add tool executions
        if (result.toolExecution) {
          toolExecutions.push(result.toolExecution);
        }
        
        // Log task completion
        this.addToLog(agent.name, 'task_complete', {
          taskId: task.id,
          taskName: task.name,
          output: result.output
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task: ${task.name}`,
            description: task.description,
            output: result.output,
            status: 'completed'
          });
        }
      } catch (error) {
        // Update task status and error
        task.status = 'failed';
        task.error = (error as Error).message;
        
        // Log task failure
        this.addToLog(task.assignedTo || 'Crew', 'task_failed', {
          taskId: task.id,
          taskName: task.name,
          error: (error as Error).message
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task: ${task.name}`,
            description: task.description,
            error: (error as Error).message,
            status: 'failed'
          });
        }
      }
    }
    
    // Generate final output based on task results
    const finalOutput = await this.generateFinalOutput(options.task);
    
    return {
      finalOutput,
      toolExecutions
    };
  }

  /**
   * Run a hierarchical process where a manager delegates to workers
   */
  private async runHierarchicalProcess(options: ProtocolExecutionOptions): Promise<{
    finalOutput: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    // Find the manager agent (first agent with allowDelegation=true)
    const manager = this.agents.find(a => a.allowDelegation);
    
    if (!manager) {
      throw new Error('No manager agent found for hierarchical process');
    }
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Process Initialization',
        description: `Starting hierarchical process with ${manager.name} as manager`,
        status: 'started'
      });
    }
    
    // Have the manager generate a plan
    const plan = await this.generateManagerPlan(manager, options.task);
    
    // Log the plan
    this.addToLog(manager.name, 'planning', {
      message: 'Generated hierarchical execution plan',
      plan: plan
    });
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Task Planning',
        description: `${manager.name} generated execution plan`,
        output: this.tasks.map(t => t.name).join(', '),
        status: 'completed'
      });
    }
    
    const tools = options.tools || this.availableTools;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Execute tasks according to plan
    for (const task of this.tasks) {
      // Skip tasks that depend on incomplete tasks
      if (task.dependsOn && task.dependsOn.length > 0) {
        const dependencies = this.tasks.filter(t => task.dependsOn!.includes(t.id));
        if (dependencies.some(d => d.status !== 'completed')) {
          continue;
        }
      }
      
      // Update task status
      task.status = 'in_progress';
      
      // Log task start
      this.addToLog(task.assignedTo || 'Crew', 'task_start', {
        taskId: task.id,
        taskName: task.name
      });
      
      // Call onStep callback if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Task: ${task.name}`,
          description: task.description,
          status: 'started'
        });
      }
      
      try {
        // Find the assigned agent
        const agent = this.agents.find(a => a.id === task.assignedTo);
        
        if (!agent) {
          throw new Error(`Agent with ID ${task.assignedTo} not found for task ${task.id}`);
        }
        
        // Execute the task with the assigned agent
        const result = await this.executeTask(task, agent, tools, options);
        
        // Update task status and result
        task.status = 'completed';
        task.result = result.output;
        
        // Add tool executions
        if (result.toolExecution) {
          toolExecutions.push(result.toolExecution);
        }
        
        // Log task completion
        this.addToLog(agent.name, 'task_complete', {
          taskId: task.id,
          taskName: task.name,
          output: result.output
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task: ${task.name}`,
            description: task.description,
            output: result.output,
            status: 'completed'
          });
        }
      } catch (error) {
        // Update task status and error
        task.status = 'failed';
        task.error = (error as Error).message;
        
        // Log task failure
        this.addToLog(task.assignedTo || 'Crew', 'task_failed', {
          taskId: task.id,
          taskName: task.name,
          error: (error as Error).message
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Task: ${task.name}`,
            description: task.description,
            error: (error as Error).message,
            status: 'failed'
          });
        }
      }
    }
    
    // Have the manager review and integrate the results
    const managerReview = await this.generateManagerReview(manager, options.task);
    
    // Log the review
    this.addToLog(manager.name, 'review', {
      message: 'Generated final review and integration',
      review: managerReview
    });
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Final Review',
        description: `${manager.name} reviewed and integrated results`,
        output: managerReview,
        status: 'completed'
      });
    }
    
    return {
      finalOutput: managerReview,
      toolExecutions
    };
  }

  /**
   * Run a consensus process where agents must reach agreement
   */
  private async runConsensusProcess(options: ProtocolExecutionOptions): Promise<{
    finalOutput: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    // For now, implement a simplified version that just gets input from all agents
    // and then has them vote on the final solution
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Process Initialization',
        description: 'Starting consensus process with all agents',
        status: 'started'
      });
    }
    
    const tools = options.tools || this.availableTools;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Generate initial proposals from each agent
    const proposals = [];
    for (const agent of this.agents) {
      try {
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Initial Proposal: ${agent.name}`,
            description: `${agent.name} generating initial proposal`,
            status: 'started'
          });
        }
        
        const proposal = await this.generateAgentProposal(agent, options.task, tools, options);
        proposals.push({
          agent: agent.name,
          proposal: proposal.output
        });
        
        // Add tool executions
        if (proposal.toolExecution) {
          toolExecutions.push(proposal.toolExecution);
        }
        
        // Log proposal
        this.addToLog(agent.name, 'proposal', {
          agentName: agent.name,
          proposal: proposal.output
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Initial Proposal: ${agent.name}`,
            description: `${agent.name} generated initial proposal`,
            output: proposal.output,
            status: 'completed'
          });
        }
      } catch (error) {
        // Log failure
        this.addToLog(agent.name, 'proposal_failed', {
          agentName: agent.name,
          error: (error as Error).message
        });
        
        // Call onStep callback if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Initial Proposal: ${agent.name}`,
            description: `${agent.name} generating initial proposal`,
            error: (error as Error).message,
            status: 'failed'
          });
        }
      }
    }
    
    // Generate consensus result based on all proposals
    const consensusResult = await this.generateConsensus(proposals, options.task);
    
    // Log consensus
    this.addToLog('Crew', 'consensus', {
      message: 'Generated consensus result',
      result: consensusResult
    });
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Consensus Generation',
        description: 'Generated final consensus result',
        output: consensusResult,
        status: 'completed'
      });
    }
    
    return {
      finalOutput: consensusResult,
      toolExecutions
    };
  }

  /**
   * Generate initial tasks for the sequential process
   */
  private async generateInitialTasks(task: string): Promise<void> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for task generation
    const taskPrompt = `${this.config.systemPrompt}

You are tasked with breaking down a complex problem into a sequence of well-defined tasks that can be assigned to specialized agents in the crew.

The crew consists of the following agents:
${this.agents.map(agent => `- ${agent.name} (${agent.role}): ${agent.goal}`).join('\n')}

For the given task, create a sequential plan with 3-7 subtasks. Each task should:
1. Have a clear objective
2. Be assigned to the most appropriate agent
3. Have well-defined expected outputs
4. Be organized in a logical sequence

Respond with a JSON array of tasks in the following format:
[
  {
    "id": "task_1",
    "name": "Short task name",
    "description": "Detailed task description",
    "expectedOutput": "What this task should produce",
    "assignedTo": "agent_id"
  },
  ...
]`;

    // Generate the tasks
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: taskPrompt,
      messages: [{ role: 'user', content: `Generate tasks for: ${task}` }]
    });
    
    // Parse tasks from the response
    const content = response.content[0].text;
    this.tasks = await this.parseTasksFromResponse(content);
  }

  /**
   * Parse tasks from the LLM response
   */
  private async parseTasksFromResponse(content: string): Promise<CrewAITask[]> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/\[([\s\S]*?)\]/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON tasks from response');
      }
      
      let tasksJson;
      try {
        tasksJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        tasksJson = JSON.parse(jsonMatch[1].trim());
      }
      
      if (!Array.isArray(tasksJson)) {
        throw new Error('Invalid tasks format in response');
      }
      
      // Convert to CrewAITask format
      return tasksJson.map((task: any) => ({
        id: task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: task.name || 'Unnamed Task',
        description: task.description || '',
        expectedOutput: task.expectedOutput || '',
        assignedTo: task.assignedTo || this.agents[0]?.id,
        status: 'pending'
      }));
    } catch (error) {
      log(`Error parsing tasks from response: ${error}`, 'agent');
      // Create a default task as fallback
      return [{
        id: `task_${Date.now()}`,
        name: 'Execute Main Task',
        description: 'Execute the requested task directly',
        expectedOutput: 'Completed task result',
        assignedTo: this.agents[0]?.id,
        status: 'pending'
      }];
    }
  }

  /**
   * Execute a task with a specific agent
   */
  private async executeTask(
    task: CrewAITask,
    agent: CrewAIAgent,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    output: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Get available tools for this agent
    const agentTools = this.getToolsForAgent(agent, tools);
    
    // Prepare context from previous tasks
    const context = this.getContextForTask(task);
    
    // Prepare system prompt for the agent
    const agentPrompt = `${this.config.systemPrompt}

${agent.systemPrompt}

You are ${agent.name}, a ${agent.role} with the following goal: ${agent.goal}

Backstory: ${agent.backstory}

You are executing a specific task as part of a crew of AI agents:
Task: ${task.name}
Description: ${task.description}
Expected Output: ${task.expectedOutput}

${this.getToolsInstructionsString(agentTools)}

Context from previous tasks:
${JSON.stringify(context, null, 2)}

Think step by step about how to accomplish this task given your role and expertise. Your response should include:
1. Your analysis of the task
2. Your approach to solving it
3. The actual work/solution
4. A clear final output that matches the expected format

Respond with a JSON object in the following format:
{
  "reasoning": "Your internal reasoning about how to approach this task",
  "output": "Your actual task output that will be used by the crew",
  "action": {
    "type": "tool_use" OR "direct_response",
    "tool": "tool_name" (if using a tool),
    "input": { ... tool parameters ... } (if using a tool)
  }
}`;

    // Execute the task
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: agentPrompt,
      messages: [{ 
        role: 'user', 
        content: `Execute task: ${task.name}`
      }]
    });
    
    // Parse the response
    return await this.parseTaskResponse(response.content[0].text, agentTools, options);
  }

  /**
   * Parse a task execution response
   */
  private async parseTaskResponse(
    content: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    output: any;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error('Could not extract JSON from task response');
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      }
      
      // Handle tool execution if present
      if (responseJson.action?.type === 'tool_use' && responseJson.action.tool && responseJson.action.input) {
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
        try {
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
            output: responseJson.output || result,
            toolExecution: {
              tool: toolName,
              input: toolInput,
              output: result
            }
          };
        } catch (error) {
          // Handle tool execution error
          log(`Error executing ${toolName}: ${error}`, 'agent');
          
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName,
              input: toolInput,
              output: undefined,
              error: (error as Error).message
            });
          }
          
          // Fall back to direct output
          return {
            output: responseJson.output || `Error executing tool: ${(error as Error).message}`,
            toolExecution: {
              tool: toolName,
              input: toolInput,
              output: `Error: ${(error as Error).message}`
            }
          };
        }
      }
      
      // Direct response (no tool use)
      return {
        output: responseJson.output || content
      };
    } catch (error) {
      log(`Error parsing task response: ${error}`, 'agent');
      
      // Return a fallback response
      return {
        output: `Failed to parse response: ${(error as Error).message}. Raw response: ${content}`
      };
    }
  }

  /**
   * Generate a hierarchical execution plan from the manager
   */
  private async generateManagerPlan(manager: CrewAIAgent, task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for the manager's plan
    const planPrompt = `${this.config.systemPrompt}

${manager.systemPrompt}

You are ${manager.name}, the manager of this crew, with the following goal: ${manager.goal}

Backstory: ${manager.backstory}

You are responsible for creating a hierarchical execution plan for the following task: ${task}

The crew consists of the following agents that you can delegate tasks to:
${this.agents.filter(a => a.id !== manager.id).map(agent => `- ${agent.name} (${agent.role}): ${agent.goal}`).join('\n')}

Create a plan with 3-7 subtasks where:
1. Each task has a clear objective
2. Tasks are assigned to the most appropriate agent
3. Dependencies between tasks are identified (if any)
4. The expected output of each task is defined

Present your plan as a JSON array in the following format:
[
  {
    "id": "task_1",
    "name": "Short task name",
    "description": "Detailed task description",
    "expectedOutput": "What this task should produce",
    "assignedTo": "agent_id",
    "dependsOn": [] // Array of task IDs this task depends on
  },
  ...
]

Explain your reasoning before providing the plan.`;

    // Generate the plan
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: planPrompt,
      messages: [{ role: 'user', content: `Create an execution plan for: ${task}` }]
    });
    
    const content = response.content[0].text;
    
    // Parse tasks from the response
    try {
      // Extract JSON array from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/\[([\s\S]*?)\]/);
      
      if (jsonMatch) {
        let tasksJson;
        try {
          tasksJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
        } catch (e) {
          try {
            tasksJson = JSON.parse(`[${jsonMatch[1].trim()}]`);
          } catch (e2) {
            throw new Error('Invalid JSON format in manager plan');
          }
        }
        
        if (Array.isArray(tasksJson)) {
          // Convert to CrewAITask format and store
          this.tasks = tasksJson.map((task: any) => ({
            id: task.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: task.name || 'Unnamed Task',
            description: task.description || '',
            expectedOutput: task.expectedOutput || '',
            assignedTo: task.assignedTo,
            dependsOn: task.dependsOn || [],
            status: 'pending'
          }));
        }
      }
    } catch (error) {
      log(`Error parsing manager plan: ${error}`, 'agent');
      // Create a default task as fallback
      this.tasks = [{
        id: `task_${Date.now()}`,
        name: 'Execute Main Task',
        description: 'Execute the requested task directly',
        expectedOutput: 'Completed task result',
        assignedTo: this.agents.find(a => a.id !== manager.id)?.id || manager.id,
        status: 'pending'
      }];
    }
    
    return content;
  }

  /**
   * Generate a review and integration of results from the manager
   */
  private async generateManagerReview(manager: CrewAIAgent, task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Get results from completed tasks
    const completedTasks = this.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.tasks.filter(t => t.status === 'failed');
    
    // Prepare system prompt for the manager's review
    const reviewPrompt = `${this.config.systemPrompt}

${manager.systemPrompt}

You are ${manager.name}, the manager of this crew, with the following goal: ${manager.goal}

Backstory: ${manager.backstory}

You are reviewing and integrating the results of a hierarchical execution plan for the task: ${task}

The execution produced the following results:

Completed tasks (${completedTasks.length}/${this.tasks.length}):
${completedTasks.map(t => {
  const agent = this.agents.find(a => a.id === t.assignedTo);
  return `- ${t.name} (${agent?.name || 'Unknown'}): ${JSON.stringify(t.result)}`;
}).join('\n')}

${failedTasks.length > 0 ? `Failed tasks (${failedTasks.length}/${this.tasks.length}):
${failedTasks.map(t => {
  const agent = this.agents.find(a => a.id === t.assignedTo);
  return `- ${t.name} (${agent?.name || 'Unknown'}): ${t.error}`;
}).join('\n')}` : ''}

Your job is to:
1. Review each task result
2. Integrate the results into a cohesive final output
3. Address any gaps or issues from failed tasks (if any)
4. Provide a comprehensive summary of the work completed
5. Deliver the final output that accomplishes the original task

Provide your integrated review and final output in a clear, well-structured format.`;

    // Generate the review
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5, // Lower temperature for more focused review
      system: reviewPrompt,
      messages: [{ role: 'user', content: `Review and integrate the results for: ${task}` }]
    });
    
    return response.content[0].text;
  }

  /**
   * Generate a proposal from an agent for the consensus process
   */
  private async generateAgentProposal(
    agent: CrewAIAgent,
    task: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    output: string;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Get available tools for this agent
    const agentTools = this.getToolsForAgent(agent, tools);
    
    // Prepare system prompt for the agent's proposal
    const proposalPrompt = `${this.config.systemPrompt}

${agent.systemPrompt}

You are ${agent.name}, a ${agent.role} with the following goal: ${agent.goal}

Backstory: ${agent.backstory}

You are part of a consensus-based crew of AI agents working together to solve the following task: ${task}

${this.getToolsInstructionsString(agentTools)}

Your job is to create a comprehensive proposal for solving this task based on your expertise and role. Your proposal should:
1. Analyze the task from your perspective
2. Propose a solution or approach
3. Highlight the strengths of your proposal
4. Acknowledge any limitations or assumptions

Respond with a JSON object in the following format:
{
  "reasoning": "Your internal reasoning about how to approach this task",
  "proposal": "Your detailed proposal for solving the task",
  "action": {
    "type": "tool_use" OR "direct_response",
    "tool": "tool_name" (if using a tool),
    "input": { ... tool parameters ... } (if using a tool)
  }
}`;

    // Generate the proposal
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: proposalPrompt,
      messages: [{ 
        role: 'user', 
        content: `Generate a proposal for: ${task}`
      }]
    });
    
    // Parse the response
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return {
          output: response.content[0].text
        };
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      }
      
      // Handle tool execution if present
      if (responseJson.action?.type === 'tool_use' && responseJson.action.tool && responseJson.action.input) {
        const toolName = responseJson.action.tool;
        const toolInput = responseJson.action.input;
        
        // Find the tool
        const tool = agentTools.find(t => t.name === toolName);
        
        if (!tool) {
          return {
            output: responseJson.proposal || response.content[0].text
          };
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
        try {
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
            output: responseJson.proposal || response.content[0].text,
            toolExecution: {
              tool: toolName,
              input: toolInput,
              output: result
            }
          };
        } catch (error) {
          // Handle tool execution error
          log(`Error executing ${toolName}: ${error}`, 'agent');
          
          return {
            output: responseJson.proposal || response.content[0].text,
            toolExecution: {
              tool: toolName,
              input: toolInput,
              output: `Error: ${(error as Error).message}`
            }
          };
        }
      }
      
      // Direct response (no tool use)
      return {
        output: responseJson.proposal || response.content[0].text
      };
    } catch (error) {
      // Return the raw response if parsing fails
      return {
        output: response.content[0].text
      };
    }
  }

  /**
   * Generate a consensus result from all proposals
   */
  private async generateConsensus(
    proposals: Array<{agent: string, proposal: string}>,
    task: string
  ): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for consensus generation
    const consensusPrompt = `${this.config.systemPrompt}

You are synthesizing multiple proposals from a crew of AI agents to generate a consensus solution for the following task: ${task}

Each agent has provided their proposal based on their role and expertise. Your job is to:
1. Identify the strengths and unique contributions of each proposal
2. Find common elements and points of agreement
3. Resolve any contradictions or conflicts
4. Create a unified solution that incorporates the best ideas
5. Ensure the final consensus addresses the original task comprehensively

The proposals are:

${proposals.map(p => `## ${p.agent}'s Proposal\n${p.proposal}\n`).join('\n\n')}

Generate a consensus solution that represents the best integration of these proposals, addressing any gaps or conflicts, and providing a comprehensive final answer to the task.`;

    // Generate the consensus
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5, // Lower temperature for more focused consensus
      system: consensusPrompt,
      messages: [{ role: 'user', content: `Generate consensus for: ${task}` }]
    });
    
    return response.content[0].text;
  }

  /**
   * Generate a final output based on task results
   */
  private async generateFinalOutput(task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Get results from completed tasks
    const completedTasks = this.tasks.filter(t => t.status === 'completed');
    const failedTasks = this.tasks.filter(t => t.status === 'failed');
    
    // Prepare system prompt for final output generation
    const finalOutputPrompt = `${this.config.systemPrompt}

You are generating a final output for a sequential execution of tasks that were performed to complete the following main task: ${task}

The execution produced the following results:

Completed tasks (${completedTasks.length}/${this.tasks.length}):
${completedTasks.map(t => {
  const agent = this.agents.find(a => a.id === t.assignedTo);
  return `- ${t.name} (${agent?.name || 'Unknown'}): ${JSON.stringify(t.result)}`;
}).join('\n')}

${failedTasks.length > 0 ? `Failed tasks (${failedTasks.length}/${this.tasks.length}):
${failedTasks.map(t => {
  const agent = this.agents.find(a => a.id === t.assignedTo);
  return `- ${t.name} (${agent?.name || 'Unknown'}): ${t.error}`;
}).join('\n')}` : ''}

Your job is to:
1. Integrate the results from all completed tasks
2. Address any gaps from failed tasks (if any)
3. Create a coherent, comprehensive final output
4. Ensure the output directly addresses the original task
5. Format the output in a clear, well-structured manner

Generate the final output that accomplishes the original task.`;

    // Generate the final output
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5, // Lower temperature for more focused output
      system: finalOutputPrompt,
      messages: [{ role: 'user', content: `Generate final output for: ${task}` }]
    });
    
    return response.content[0].text;
  }

  /**
   * Create default agents if none are provided
   */
  private createDefaultAgents(): CrewAIAgent[] {
    return [
      {
        id: 'manager',
        name: 'Project Manager',
        role: 'Manager',
        goal: 'Coordinate the team and ensure task completion',
        backstory: 'An experienced project manager with a track record of successful multi-agent coordination and efficient task delegation.',
        systemPrompt: 'You are a Project Manager responsible for coordinating a team of specialized agents. Your job is to break down complex tasks, delegate effectively, and ensure the team delivers high-quality results on time.',
        allowDelegation: true
      },
      {
        id: 'researcher',
        name: 'Research Specialist',
        role: 'Researcher',
        goal: 'Gather information and provide insights',
        backstory: 'A meticulous researcher with expertise in finding relevant information, analyzing data, and providing evidence-based insights.',
        systemPrompt: 'You are a Research Specialist responsible for information gathering and analysis. Your expertise is in finding relevant data, providing insights, and supporting the team with evidence-based information.'
      },
      {
        id: 'implementer',
        name: 'Implementation Expert',
        role: 'Implementer',
        goal: 'Execute tasks and implement solutions',
        backstory: 'A skilled implementer with extensive experience in executing plans, creating solutions, and handling operational details efficiently.',
        systemPrompt: 'You are an Implementation Expert responsible for executing plans and creating solutions. Your expertise is in turning ideas into reality, handling details, and ensuring practical feasibility.'
      },
      {
        id: 'critic',
        name: 'Quality Assurance Specialist',
        role: 'Critic',
        goal: 'Evaluate solutions and identify improvements',
        backstory: 'A detail-oriented critic with a keen eye for identifying potential issues, evaluating quality, and suggesting improvements.',
        systemPrompt: 'You are a Quality Assurance Specialist responsible for evaluating solutions and identifying improvements. Your expertise is in critical thinking, quality control, and constructive feedback.'
      }
    ];
  }

  /**
   * Get context for a task from previous task results
   */
  private getContextForTask(task: CrewAITask): any {
    // If task has dependencies, include results from those tasks
    if (task.dependsOn && task.dependsOn.length > 0) {
      const dependencies = this.tasks.filter(t => 
        task.dependsOn!.includes(t.id) && 
        t.status === 'completed'
      );
      
      return {
        dependencyResults: dependencies.map(d => ({
          taskId: d.id,
          taskName: d.name,
          result: d.result
        }))
      };
    }
    
    // Otherwise, include all completed tasks before this one
    const currentTaskIndex = this.tasks.findIndex(t => t.id === task.id);
    const previousTasks = this.tasks.slice(0, currentTaskIndex).filter(t => t.status === 'completed');
    
    return {
      previousResults: previousTasks.map(t => ({
        taskId: t.id,
        taskName: t.name,
        result: t.result
      }))
    };
  }

  /**
   * Get tools available for a specific agent
   */
  private getToolsForAgent(agent: CrewAIAgent, allTools: AgentTool[]): AgentTool[] {
    if (!agent.tools || agent.tools.length === 0) {
      return allTools; // All tools available if not specified
    }
    
    return allTools.filter(tool => agent.tools!.includes(tool.name));
  }

  /**
   * Get tools instructions string
   */
  private getToolsInstructionsString(tools: AgentTool[]): string {
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
   * Add an entry to the process log
   */
  private addToLog(agent: string, action: string, details: any): void {
    this.processLog.push({
      timestamp: new Date(),
      agent,
      action,
      details
    });
  }

  /**
   * Get the process transcript
   */
  private getProcessTranscript(): string {
    let transcript = '';
    
    this.processLog.forEach(entry => {
      const time = entry.timestamp.toLocaleTimeString();
      transcript += `[${time}] ${entry.agent} - ${entry.action}\n`;
      
      if (entry.details) {
        if (typeof entry.details === 'string') {
          transcript += entry.details + '\n';
        } else if (typeof entry.details === 'object') {
          if (entry.details.message) {
            transcript += `${entry.details.message}\n`;
          }
          
          if (entry.details.output) {
            transcript += `Output: ${JSON.stringify(entry.details.output)}\n`;
          }
          
          if (entry.details.error) {
            transcript += `Error: ${entry.details.error}\n`;
          }
        }
      }
      
      transcript += '\n';
    });
    
    return transcript;
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
    
    // Update agents if provided
    if (config.agents) {
      this.agents = config.agents as CrewAIAgent[];
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
    this.tasks = [];
    this.processLog = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}