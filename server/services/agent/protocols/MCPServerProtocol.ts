/**
 * MCP Server Protocol Implementation
 * 
 * Implements the Message Control Protocol server for distributed agent communication.
 * Focuses on multi-agent coordination and message passing architectures.
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
import { EventEmitter } from 'events';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Message types for MCP protocol
enum MCPMessageType {
  COMMAND = 'command',
  RESPONSE = 'response',
  NOTIFICATION = 'notification',
  ERROR = 'error',
  SYSTEM = 'system'
}

// Agent execution state
enum AgentState {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING = 'waiting',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// MCP Message interface
interface MCPMessage {
  id: string;
  type: MCPMessageType;
  sender: string;
  recipients: string[];
  content: any;
  timestamp: string;
  priority: number;
  metadata?: Record<string, any>;
}

// MCP Agent interface
interface MCPAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  state: AgentState;
  inbox: MCPMessage[];
  outbox: MCPMessage[];
  memory: Record<string, any>;
}

// Execution context for server
interface MCPServerExecutionContext {
  agents: MCPAgent[];
  messages: MCPMessage[];
  taskDecomposition: {
    mainGoal: string;
    subTasks: string[];
    dependencies: Record<string, string[]>;
  };
  executionGraph: {
    nodes: Array<{id: string, agentId: string, task: string}>;
    edges: Array<{source: string, target: string, label?: string}>;
  };
  variables: Record<string, any>;
  executionLog: string[];
  startTime: string;
  endTime?: string;
  status: 'running' | 'completed' | 'failed';
}

export class MCPServerProtocol extends EventEmitter implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are the Message Control Protocol (MCP) Server, a distributed coordination system for multi-agent architectures.
You excel at:
1. Agent communication and message routing
2. Task decomposition and delegation
3. Maintaining distributed state
4. Monitoring agent execution
5. Resolving conflicts between agents`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.3,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.MULTI_AGENT,
      ProtocolCapabilities.PARALLEL_EXECUTION,
      ProtocolCapabilities.MESSAGE_PASSING
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // MCP Server state
  private executionContext: MCPServerExecutionContext | null = null;
  private taskAnalysis: string = '';
  private messageCount: number = 0;
  private toolCallResults: Record<string, any> = {};

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'MCP Server',
      version: '1.0.0',
      description: 'Message Control Protocol server for distributed agent communication',
      capabilities: [
        ProtocolCapabilities.MULTI_AGENT,
        ProtocolCapabilities.PARALLEL_EXECUTION,
        ProtocolCapabilities.MESSAGE_PASSING
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
    
    // Reset state
    this.executionContext = null;
    this.taskAnalysis = '';
    this.messageCount = 0;
    this.toolCallResults = {};
    
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
          description: 'Analyzing task and creating agent configuration',
          status: 'started'
        });
      }

      // Step 1: Analyze task and create a plan with agents
      await this.analyzeTask(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Analysis',
          description: 'Task analysis completed',
          output: { 
            taskAnalysis: this.taskAnalysis.substring(0, 200) + '...',
            agentCount: this.executionContext?.agents.length
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'MCP Setup',
          description: 'Setting up MCP communication server',
          status: 'started'
        });
      }

      // Step 2: Setup MCP Server and initialize agents
      await this.setupMCPServer(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'MCP Setup',
          description: 'MCP server initialized',
          output: { 
            agentCount: this.executionContext?.agents.length,
            messageCount: this.executionContext?.messages.length 
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Execution',
          description: 'Executing agent communication',
          status: 'started'
        });
      }

      // Step 3: Run the MCP simulation with agent messages
      await this.runMCPSimulation(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Execution',
          description: 'Agent execution completed',
          output: { 
            status: this.executionContext?.status,
            messageCount: this.executionContext?.messages.length
          },
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.formatFinalResponse();
      
      const toolCalls = this.getToolCallsHistory();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: toolCalls
        },
        executionTime: Date.now() - startTime,
        protocol: 'mcpserver',
        metadata: {
          agentCount: this.executionContext?.agents.length,
          messageCount: this.executionContext?.messages.length,
          executionStatus: this.executionContext?.status
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`MCP Server Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Analyze task and determine required agents
   */
  private async analyzeTask(task: string, options: ProtocolExecutionOptions): Promise<void> {
    const analysisPrompt = `As the Message Control Protocol (MCP) Server, analyze this task to determine the optimal multi-agent setup:

Task: ${task}

Please provide a detailed analysis including:
1. Main goal and primary objectives
2. Optimal agent roles needed (3-5 specialized agents)
3. Task decomposition into subtasks for each agent
4. Dependencies between subtasks and coordination requirements
5. Potential tools or external resources needed
6. Communication patterns between agents

This analysis will guide the MCP server configuration and agent communication patterns.`;

    // Get analysis from LLM
    const analysis = await this.getResponseFromLLM(analysisPrompt);
    
    // Store the analysis
    this.taskAnalysis = analysis;
    
    // Create initial execution context based on analysis
    this.executionContext = {
      agents: [],
      messages: [],
      taskDecomposition: {
        mainGoal: task,
        subTasks: [],
        dependencies: {}
      },
      executionGraph: {
        nodes: [],
        edges: []
      },
      variables: {
        task
      },
      executionLog: [],
      startTime: new Date().toISOString(),
      status: 'running'
    };
    
    // Now use the analysis to derive agents and task decomposition
    await this.deriveAgentsFromAnalysis(options);
  }

  /**
   * Create agents based on task analysis
   */
  private async deriveAgentsFromAnalysis(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    const derivePrompt = `Based on this task analysis, create a set of specialized agents for the MCP server:

${this.taskAnalysis}

For each agent, specify:
1. A unique ID and descriptive name
2. A clear role definition
3. A concise description of its responsibilities
4. Key capabilities and skills
5. Initial state (should be "idle")

Then, decompose the main task into appropriate subtasks for each agent, noting any dependencies.

Respond with a structured JSON containing:
1. An array of agent definitions
2. A task decomposition object with subtasks and dependencies
3. An execution graph with nodes (agent+task pairs) and edges (dependencies)`;

    // Get agent configuration from LLM
    const agentConfigResponse = await this.getResponseFromLLM(derivePrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = agentConfigResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const configJson = JSON.parse(jsonMatch[0]);
        
        // Populate agents
        if (Array.isArray(configJson.agents)) {
          this.executionContext.agents = configJson.agents.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            description: agent.description,
            capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
            state: AgentState.IDLE,
            inbox: [],
            outbox: [],
            memory: {}
          }));
        }
        
        // Populate task decomposition
        if (configJson.taskDecomposition) {
          this.executionContext.taskDecomposition = {
            mainGoal: configJson.taskDecomposition.mainGoal || this.executionContext.taskDecomposition.mainGoal,
            subTasks: Array.isArray(configJson.taskDecomposition.subTasks) 
              ? configJson.taskDecomposition.subTasks 
              : [],
            dependencies: configJson.taskDecomposition.dependencies || {}
          };
        }
        
        // Populate execution graph
        if (configJson.executionGraph) {
          this.executionContext.executionGraph = {
            nodes: Array.isArray(configJson.executionGraph.nodes) 
              ? configJson.executionGraph.nodes 
              : [],
            edges: Array.isArray(configJson.executionGraph.edges) 
              ? configJson.executionGraph.edges 
              : []
          };
        }
      } else {
        throw new Error('Could not extract agent configuration JSON');
      }
    } catch (error) {
      log(`Error parsing agent configuration: ${error}`, 'agent');
      
      // Create basic fallback agents
      this.createFallbackAgents();
    }
  }

  /**
   * Create basic fallback agents if parsing fails
   */
  private createFallbackAgents(): void {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Create basic set of agents
    this.executionContext.agents = [
      {
        id: 'coordinator',
        name: 'Task Coordinator',
        role: 'Coordinator',
        description: 'Manages overall task execution and coordinates other agents',
        capabilities: ['coordination', 'planning', 'monitoring'],
        state: AgentState.IDLE,
        inbox: [],
        outbox: [],
        memory: {}
      },
      {
        id: 'researcher',
        name: 'Information Researcher',
        role: 'Researcher',
        description: 'Gathers and analyzes information needed for the task',
        capabilities: ['research', 'analysis', 'summarization'],
        state: AgentState.IDLE,
        inbox: [],
        outbox: [],
        memory: {}
      },
      {
        id: 'executor',
        name: 'Task Executor',
        role: 'Executor',
        description: 'Executes specific actions and tool calls',
        capabilities: ['tool_use', 'action_execution', 'reporting'],
        state: AgentState.IDLE,
        inbox: [],
        outbox: [],
        memory: {}
      }
    ];
    
    // Create basic task decomposition
    this.executionContext.taskDecomposition = {
      mainGoal: this.executionContext.taskDecomposition.mainGoal,
      subTasks: [
        'Analyze task requirements',
        'Research necessary information',
        'Execute required actions',
        'Compile results'
      ],
      dependencies: {
        'Research necessary information': ['Analyze task requirements'],
        'Execute required actions': ['Research necessary information'],
        'Compile results': ['Execute required actions']
      }
    };
    
    // Create basic execution graph
    this.executionContext.executionGraph = {
      nodes: [
        { id: 'node1', agentId: 'coordinator', task: 'Analyze task requirements' },
        { id: 'node2', agentId: 'researcher', task: 'Research necessary information' },
        { id: 'node3', agentId: 'executor', task: 'Execute required actions' },
        { id: 'node4', agentId: 'coordinator', task: 'Compile results' }
      ],
      edges: [
        { source: 'node1', target: 'node2' },
        { source: 'node2', target: 'node3' },
        { source: 'node3', target: 'node4' }
      ]
    };
  }

  /**
   * Setup the MCP server
   */
  private async setupMCPServer(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Create an initial system broadcast message
    const systemMessage: MCPMessage = this.createMessage(
      MCPMessageType.SYSTEM,
      'mcp_server',
      this.executionContext.agents.map(a => a.id),
      {
        action: 'server_initialized',
        mainGoal: this.executionContext.taskDecomposition.mainGoal,
        agentCount: this.executionContext.agents.length
      },
      10
    );
    
    this.executionContext.messages.push(systemMessage);
    
    // Assign initial tasks to agents based on execution graph
    const initialNodes = this.executionContext.executionGraph.nodes.filter(node =>
      !this.executionContext!.executionGraph.edges.some(edge => edge.target === node.id)
    );
    
    for (const node of initialNodes) {
      const agent = this.executionContext.agents.find(a => a.id === node.agentId);
      if (agent) {
        // Create a command message for the agent
        const commandMessage: MCPMessage = this.createMessage(
          MCPMessageType.COMMAND,
          'mcp_server',
          [agent.id],
          {
            action: 'execute_task',
            task: node.task,
            nodeId: node.id,
            context: this.executionContext.taskDecomposition.mainGoal
          },
          5
        );
        
        // Add to server messages and agent inbox
        this.executionContext.messages.push(commandMessage);
        agent.inbox.push(commandMessage);
        
        // Update agent state
        agent.state = AgentState.WAITING;
        
        // Log the assignment
        this.executionContext.executionLog.push(
          `[${new Date().toISOString()}] Assigned task "${node.task}" to agent ${agent.name}`
        );
      }
    }
  }

  /**
   * Run the MCP simulation
   */
  private async runMCPSimulation(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Maximum number of simulation steps to prevent infinite loops
    const maxSteps = 15;
    let currentStep = 0;
    
    // Process until all agents are done or max steps reached
    while (
      this.executionContext.agents.some(a => a.state !== AgentState.COMPLETED && a.state !== AgentState.FAILED) &&
      currentStep < maxSteps &&
      this.executionContext.status === 'running'
    ) {
      // Process one step of the simulation
      await this.processMCPStep(options);
      
      currentStep++;
    }
    
    // Check completion status
    const allCompleted = this.executionContext.agents.every(
      a => a.state === AgentState.COMPLETED || a.state === AgentState.FAILED
    );
    
    if (allCompleted) {
      // Mark as completed
      this.executionContext.status = 'completed';
      this.executionContext.endTime = new Date().toISOString();
      
      // Final system message
      const completionMessage: MCPMessage = this.createMessage(
        MCPMessageType.SYSTEM,
        'mcp_server',
        this.executionContext.agents.map(a => a.id),
        {
          action: 'execution_completed',
          status: 'completed',
          totalSteps: currentStep,
          totalMessages: this.executionContext.messages.length
        },
        10
      );
      
      this.executionContext.messages.push(completionMessage);
      this.executionContext.executionLog.push(
        `[${new Date().toISOString()}] MCP execution completed after ${currentStep} steps`
      );
    } else if (currentStep >= maxSteps) {
      // Mark as failed due to max steps
      this.executionContext.status = 'failed';
      this.executionContext.endTime = new Date().toISOString();
      
      // Final system message
      const timeoutMessage: MCPMessage = this.createMessage(
        MCPMessageType.SYSTEM,
        'mcp_server',
        this.executionContext.agents.map(a => a.id),
        {
          action: 'execution_timeout',
          status: 'failed',
          reason: 'Maximum simulation steps reached',
          totalSteps: currentStep
        },
        10
      );
      
      this.executionContext.messages.push(timeoutMessage);
      this.executionContext.executionLog.push(
        `[${new Date().toISOString()}] MCP execution timed out after ${maxSteps} steps`
      );
    }
  }

  /**
   * Process a single step of the MCP simulation
   */
  private async processMCPStep(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Process each agent that has messages to handle
    for (const agent of this.executionContext.agents) {
      // Skip agents that are already completed or failed
      if (agent.state === AgentState.COMPLETED || agent.state === AgentState.FAILED) {
        continue;
      }
      
      // Process agent's inbox if it has messages and is waiting
      if (agent.inbox.length > 0 && agent.state === AgentState.WAITING) {
        await this.processAgentInbox(agent, options);
      }
    }
    
    // Process outbox messages from all agents
    for (const agent of this.executionContext.agents) {
      if (agent.outbox.length > 0) {
        await this.processAgentOutbox(agent);
      }
    }
    
    // Check for task dependencies and start newly available tasks
    await this.checkAndStartDependentTasks();
  }

  /**
   * Process an agent's inbox
   */
  private async processAgentInbox(agent: MCPAgent, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Set agent to thinking
    agent.state = AgentState.THINKING;
    
    // Get the most important message from inbox
    const messages = [...agent.inbox].sort((a, b) => b.priority - a.priority);
    const currentMessage = messages[0];
    
    // Remove the message from inbox
    agent.inbox = agent.inbox.filter(m => m.id !== currentMessage.id);
    
    // Log the processing
    this.executionContext.executionLog.push(
      `[${new Date().toISOString()}] Agent ${agent.name} processing message: ${currentMessage.type}`
    );
    
    try {
      // Set agent to executing
      agent.state = AgentState.EXECUTING;
      
      // Generate agent's thought process and response
      const agentResponse = await this.generateAgentResponse(agent, currentMessage, options);
      
      // Add the response message to agent's outbox
      agent.outbox.push(agentResponse);
      
      // Set agent back to waiting
      agent.state = AgentState.WAITING;
    } catch (error) {
      // Log the error
      this.executionContext.executionLog.push(
        `[${new Date().toISOString()}] Agent ${agent.name} failed to process message: ${(error as Error).message}`
      );
      
      // Create error message
      const errorMessage = this.createMessage(
        MCPMessageType.ERROR,
        agent.id,
        ['mcp_server'],
        {
          error: (error as Error).message,
          originalMessage: currentMessage.id
        },
        10
      );
      
      // Add to agent's outbox
      agent.outbox.push(errorMessage);
      
      // Set agent to waiting
      agent.state = AgentState.WAITING;
    }
  }

  /**
   * Generate an agent's response to a message
   */
  private async generateAgentResponse(
    agent: MCPAgent, 
    message: MCPMessage,
    options: ProtocolExecutionOptions
  ): Promise<MCPMessage> {
    // Handle different message types
    if (message.type === MCPMessageType.COMMAND && message.content.action === 'execute_task') {
      return this.executeAgentTask(agent, message, options);
    } else if (message.type === MCPMessageType.RESPONSE || message.type === MCPMessageType.NOTIFICATION) {
      return this.processAgentInformation(agent, message);
    } else {
      // For other message types, generate a generic response
      const responsePrompt = `You are acting as the agent "${agent.name}" (${agent.role}) with the following description: ${agent.description}.

You have received this message:
${JSON.stringify(message, null, 2)}

Based on your role and capabilities ${JSON.stringify(agent.capabilities)}, how do you respond to this message?
Your response should include:
1. Your understanding of the message
2. Any actions you would take
3. The content of your response message

Keep your response concise and focused on your specific role.`;

      const responseContent = await this.getResponseFromLLM(responsePrompt);
      
      // Create response message
      return this.createMessage(
        MCPMessageType.RESPONSE,
        agent.id,
        message.sender === 'mcp_server' ? ['mcp_server'] : [message.sender],
        {
          originalMessageId: message.id,
          content: responseContent
        },
        7
      );
    }
  }

  /**
   * Execute a task with an agent
   */
  private async executeAgentTask(
    agent: MCPAgent, 
    message: MCPMessage,
    options: ProtocolExecutionOptions
  ): Promise<MCPMessage> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    const task = message.content.task;
    const nodeId = message.content.nodeId;
    
    // Log task execution
    this.executionContext.executionLog.push(
      `[${new Date().toISOString()}] Agent ${agent.name} executing task: ${task}`
    );
    
    // Build the agent task prompt
    const taskPrompt = `You are acting as the agent "${agent.name}" (${agent.role}) with the following description: ${agent.description}.

You are part of a multi-agent system working on this main goal: ${this.executionContext.taskDecomposition.mainGoal}

Your specific task is: ${task}

Your capabilities include: ${agent.capabilities.join(', ')}

Available tools: ${this.availableTools.map(t => t.name).join(', ')}

Think step by step about how to accomplish this task:
1. Analyze what information you need
2. Determine what actions to take or tools to use
3. Consider how your work fits into the larger goal
4. Identify what information to share with other agents

Then execute the task and provide:
1. Your results or findings
2. Any tool calls you need to make (if applicable)
3. Recommendations for next steps
4. Information that should be shared with other agents`;

    // Get task execution from LLM
    const taskExecution = await this.getResponseFromLLM(taskPrompt);
    
    // Check if there are tool calls in the response
    const toolCallMatch = taskExecution.match(/Tool Call:[\s\S]*?```(?:json)?\s*([\s\S]*?)```/i);
    let toolResults: any = null;
    
    if (toolCallMatch && toolCallMatch[1]) {
      try {
        // Extract tool call JSON
        const toolCallJson = JSON.parse(toolCallMatch[1].trim());
        const toolName = toolCallJson.tool || toolCallJson.name;
        const toolInput = toolCallJson.input || toolCallJson.parameters || toolCallJson.params || {};
        
        // Find the tool
        const tool = this.availableTools.find(t => 
          t.name === toolName || 
          t.name.toLowerCase() === toolName.toLowerCase()
        );
        
        if (tool) {
          // Call onToolUse callback if provided
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: tool.name,
              input: toolInput,
              output: undefined,
              error: undefined
            });
          }
          
          try {
            // Execute the tool
            const result = await tool.execute(toolInput);
            
            // Update the tool use callback with the result
            if (options.callbacks?.onToolUse) {
              options.callbacks.onToolUse({
                toolName: tool.name,
                input: toolInput,
                output: result,
                error: undefined
              });
            }
            
            // Store tool results
            toolResults = {
              tool: tool.name,
              input: toolInput,
              output: result
            };
            
            // Save in tool call history
            this.toolCallResults[`${agent.id}_${this.messageCount}`] = toolResults;
            
            // Log tool execution
            this.executionContext.executionLog.push(
              `[${new Date().toISOString()}] Agent ${agent.name} executed tool ${tool.name}`
            );
          } catch (error) {
            // Update the tool use callback with the error
            if (options.callbacks?.onToolUse) {
              options.callbacks.onToolUse({
                toolName: tool.name,
                input: toolInput,
                output: undefined,
                error: (error as Error).message
              });
            }
            
            // Store error result
            toolResults = {
              tool: tool.name,
              input: toolInput,
              error: (error as Error).message
            };
            
            // Save in tool call history
            this.toolCallResults[`${agent.id}_${this.messageCount}`] = toolResults;
            
            // Log tool error
            this.executionContext.executionLog.push(
              `[${new Date().toISOString()}] Agent ${agent.name} tool error: ${(error as Error).message}`
            );
          }
        }
      } catch (error) {
        // Log parsing error
        this.executionContext.executionLog.push(
          `[${new Date().toISOString()}] Error parsing tool call: ${(error as Error).message}`
        );
      }
    }
    
    // Create task completion message
    const taskCompletionMessage = this.createMessage(
      MCPMessageType.RESPONSE,
      agent.id,
      ['mcp_server'],
      {
        nodeId,
        task,
        status: 'completed',
        result: taskExecution,
        toolCall: toolResults
      },
      8
    );
    
    // If the agent detected information to share with other agents
    const sharingMatch = taskExecution.match(/Information for other agents:[\s\S]*?((?:Agent|For|Share with)[\s\S]*?)(?:\n\n|$)/i);
    if (sharingMatch) {
      // Determine which agents to notify based on the sharing text
      const sharingText = sharingMatch[1];
      const targetAgents = this.executionContext.agents
        .filter(a => a.id !== agent.id && sharingText.toLowerCase().includes(a.name.toLowerCase()));
      
      if (targetAgents.length > 0) {
        // Create information sharing message
        const sharingMessage = this.createMessage(
          MCPMessageType.NOTIFICATION,
          agent.id,
          targetAgents.map(a => a.id),
          {
            type: 'information_sharing',
            task,
            information: sharingText
          },
          6
        );
        
        // Add to agent's outbox
        agent.outbox.push(sharingMessage);
      }
    }
    
    return taskCompletionMessage;
  }

  /**
   * Process information from another agent
   */
  private async processAgentInformation(
    agent: MCPAgent, 
    message: MCPMessage
  ): Promise<MCPMessage> {
    // Update agent's memory with the new information
    if (!agent.memory.information) {
      agent.memory.information = [];
    }
    
    agent.memory.information.push({
      from: message.sender,
      timestamp: message.timestamp,
      content: message.content
    });
    
    // Create acknowledgment message
    return this.createMessage(
      MCPMessageType.RESPONSE,
      agent.id,
      [message.sender],
      {
        type: 'acknowledgment',
        originalMessageId: message.id,
        status: 'received'
      },
      5
    );
  }

  /**
   * Process an agent's outbox
   */
  private async processAgentOutbox(agent: MCPAgent): Promise<void> {
    if (!this.executionContext) {
      throw new Error('Execution context not initialized');
    }
    
    // Process each message in outbox
    for (const message of agent.outbox) {
      // Add to global message list
      this.executionContext.messages.push(message);
      
      // Deliver to recipients
      for (const recipientId of message.recipients) {
        if (recipientId === 'mcp_server') {
          // Message for the server, check for task completion
          if (message.type === MCPMessageType.RESPONSE && 
              message.content.status === 'completed' && 
              message.content.nodeId) {
            
            // Mark the execution node as completed
            const node = this.executionContext.executionGraph.nodes.find(
              n => n.id === message.content.nodeId
            );
            
            if (node) {
              // Log node completion
              this.executionContext.executionLog.push(
                `[${new Date().toISOString()}] Completed execution node: ${node.id} (${node.task})`
              );
              
              // If this was the agent's last task, mark as completed
              const remainingTasks = this.executionContext.executionGraph.nodes.filter(
                n => n.agentId === agent.id && !this.isNodeCompleted(n.id)
              );
              
              if (remainingTasks.length === 0) {
                agent.state = AgentState.COMPLETED;
                
                // Log agent completion
                this.executionContext.executionLog.push(
                  `[${new Date().toISOString()}] Agent ${agent.name} completed all tasks`
                );
              }
            }
          }
        } else {
          // Find recipient agent
          const recipientAgent = this.executionContext.agents.find(a => a.id === recipientId);
          if (recipientAgent) {
            // Add to recipient's inbox
            recipientAgent.inbox.push(message);
          }
        }
      }
    }
    
    // Clear the outbox
    agent.outbox = [];
  }

  /**
   * Check if a node has been completed
   */
  private isNodeCompleted(nodeId: string): boolean {
    if (!this.executionContext) {
      return false;
    }
    
    // Check if there's a response message marking this node as completed
    return this.executionContext.messages.some(
      m => m.type === MCPMessageType.RESPONSE && 
           m.content.nodeId === nodeId && 
           m.content.status === 'completed'
    );
  }

  /**
   * Check for dependent tasks that can now be started
   */
  private async checkAndStartDependentTasks(): Promise<void> {
    if (!this.executionContext) {
      return;
    }
    
    // Get all completed node IDs
    const completedNodeIds = this.executionContext.executionGraph.nodes
      .filter(node => this.isNodeCompleted(node.id))
      .map(node => node.id);
    
    // Find nodes that have all dependencies satisfied
    const availableNodes = this.executionContext.executionGraph.nodes.filter(node => {
      // Skip already completed nodes
      if (this.isNodeCompleted(node.id)) {
        return false;
      }
      
      // Check if all dependencies are completed
      const dependencies = this.executionContext!.executionGraph.edges
        .filter(edge => edge.target === node.id)
        .map(edge => edge.source);
      
      return dependencies.every(depId => completedNodeIds.includes(depId));
    });
    
    // Start each available node
    for (const node of availableNodes) {
      // Find the agent
      const agent = this.executionContext.agents.find(a => a.id === node.agentId);
      if (agent && agent.state !== AgentState.FAILED) {
        // Create a command message for the agent
        const commandMessage: MCPMessage = this.createMessage(
          MCPMessageType.COMMAND,
          'mcp_server',
          [agent.id],
          {
            action: 'execute_task',
            task: node.task,
            nodeId: node.id,
            context: this.executionContext.taskDecomposition.mainGoal
          },
          5
        );
        
        // Add to server messages and agent inbox
        this.executionContext.messages.push(commandMessage);
        agent.inbox.push(commandMessage);
        
        // Update agent state if idle
        if (agent.state === AgentState.IDLE) {
          agent.state = AgentState.WAITING;
        }
        
        // Log the assignment
        this.executionContext.executionLog.push(
          `[${new Date().toISOString()}] Assigned task "${node.task}" to agent ${agent.name}`
        );
      }
    }
  }

  /**
   * Create a new MCP message
   */
  private createMessage(
    type: MCPMessageType,
    sender: string,
    recipients: string[],
    content: any,
    priority: number = 5
  ): MCPMessage {
    this.messageCount++;
    
    return {
      id: `msg_${Date.now()}_${this.messageCount}`,
      type,
      sender,
      recipients,
      content,
      timestamp: new Date().toISOString(),
      priority
    };
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(): string {
    if (!this.executionContext) {
      return 'Error: MCP server execution incomplete';
    }
    
    let response = `# MCP Server - Multi-Agent Execution Report\n\n`;
    
    // Overall status
    response += `## Execution Status\n`;
    response += `- **Status**: ${this.executionContext.status}\n`;
    
    if (this.executionContext.startTime && this.executionContext.endTime) {
      const startTime = new Date(this.executionContext.startTime);
      const endTime = new Date(this.executionContext.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      response += `- **Duration**: ${durationMs}ms\n`;
    }
    
    response += `- **Agent Count**: ${this.executionContext.agents.length}\n`;
    response += `- **Message Count**: ${this.executionContext.messages.length}\n\n`;
    
    // Task decomposition
    response += `## Task Decomposition\n`;
    response += `### Main Goal\n${this.executionContext.taskDecomposition.mainGoal}\n\n`;
    
    response += `### Subtasks\n`;
    for (const subtask of this.executionContext.taskDecomposition.subTasks) {
      response += `- ${subtask}\n`;
    }
    response += `\n`;
    
    // Agent summary
    response += `## Agent Summary\n`;
    for (const agent of this.executionContext.agents) {
      response += `### ${agent.name} (${agent.role})\n`;
      response += `- **Status**: ${agent.state}\n`;
      response += `- **Description**: ${agent.description}\n`;
      
      // Count tasks assigned to this agent
      const assignedTasks = this.executionContext.executionGraph.nodes
        .filter(node => node.agentId === agent.id);
      
      response += `- **Tasks**: ${assignedTasks.length}\n`;
      response += `- **Capabilities**: ${agent.capabilities.join(', ')}\n\n`;
    }
    
    // Execution log highlights
    response += `## Execution Highlights\n`;
    
    // Include up to 10 most important log entries
    const highlightLogs = this.executionContext.executionLog
      .filter(log => 
        log.includes('task') || 
        log.includes('complete') || 
        log.includes('executed tool') ||
        log.includes('error')
      )
      .slice(-10);
    
    for (const log of highlightLogs) {
      response += `${log}\n`;
    }
    response += `\n`;
    
    // Final results
    response += `## Results and Findings\n`;
    
    // Find output-related messages
    const resultMessages = this.executionContext.messages
      .filter(m => 
        (m.type === MCPMessageType.RESPONSE && m.content.status === 'completed') ||
        (m.type === MCPMessageType.SYSTEM && m.content.action === 'execution_completed')
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    if (resultMessages.length > 0) {
      // Include the results from the last completed tasks
      const completionResults = resultMessages
        .filter(m => m.type === MCPMessageType.RESPONSE && m.content.result)
        .slice(0, 3);
      
      for (const result of completionResults) {
        const agent = this.executionContext.agents.find(a => a.id === result.sender);
        response += `### From ${agent ? agent.name : result.sender}\n`;
        
        // Extract key findings and remove tool call details
        let resultText = result.content.result;
        resultText = resultText.replace(/Tool Call:[\s\S]*?```(?:json)?\s*[\s\S]*?```/i, '[Tool Call Executed]');
        
        response += resultText + '\n\n';
      }
    } else {
      response += `No final results available.\n\n`;
    }
    
    // Tool usage summary
    if (Object.keys(this.toolCallResults).length > 0) {
      response += `## Tool Usage Summary\n`;
      
      for (const [key, result] of Object.entries(this.toolCallResults)) {
        const [agentId] = key.split('_');
        const agent = this.executionContext.agents.find(a => a.id === agentId);
        
        response += `### ${agent ? agent.name : agentId} - ${(result as any).tool}\n`;
        response += `**Input**: \`${JSON.stringify((result as any).input)}\`\n`;
        
        if ((result as any).error) {
          response += `**Error**: ${(result as any).error}\n`;
        } else if ((result as any).output) {
          const output = (result as any).output;
          response += `**Output**: `;
          
          if (typeof output === 'object') {
            response += '\n```\n' + JSON.stringify(output, null, 2) + '\n```\n';
          } else {
            response += `${output}\n`;
          }
        }
        
        response += '\n';
      }
    }
    
    return response;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    for (const result of Object.values(this.toolCallResults)) {
      if ((result as any).tool) {
        toolCalls.push({
          name: (result as any).tool,
          input: (result as any).input || {},
          output: (result as any).error ? { error: (result as any).error } : (result as any).output
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
    // Reset state
    this.executionContext = null;
    this.taskAnalysis = '';
    this.messageCount = 0;
    this.toolCallResults = {};
    this.initialized = false;
    
    // Remove all listeners
    this.removeAllListeners();
    
    return Promise.resolve();
  }
}