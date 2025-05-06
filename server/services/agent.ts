import Anthropic from '@anthropic-ai/sdk';
import { log } from '../vite';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const CLAUDE_MODEL = 'claude-3-7-sonnet-20250219';

// Different agent types
export enum AgentType {
  ASSISTANT = 'assistant',         // Basic single task agent
  RESEARCHER = 'researcher',       // Information gathering agent
  ANALYZER = 'analyzer',           // Data analysis agent
  EXECUTOR = 'executor',           // Task executor agent
  COORDINATOR = 'coordinator',     // Multi-agent coordinator
  SPECIALIST = 'specialist',       // Domain-specific specialist agent
  AUTONOMOUS = 'autonomous'        // Autonomous agent that can plan and execute complex tasks
}

// Agent capabilities
export interface AgentCapabilities {
  multiStep?: boolean;            // Can handle multi-step reasoning
  useTools?: boolean;             // Can use external tools
  memory?: boolean;               // Has persistent memory
  autonomous?: boolean;           // Can operate autonomously
  multiAgent?: boolean;           // Can coordinate with other agents
  specialization?: string;        // Specific domain expertise
  supervisionRequired?: boolean;  // Requires human supervision
}

// Agent options
export interface AgentOptions {
  agentType: AgentType;
  capabilities?: AgentCapabilities;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: AgentTool[];
  memory?: AgentMemory;
  specialization?: string; // For specialist agents
}

// Agent memory interface
export interface AgentMemory {
  conversations: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
  }>;
  context?: Record<string, any>;
  addEntry(role: 'user' | 'assistant' | 'system', content: string): void;
  getRecentConversation(limit?: number): Array<{role: string, content: string}>;
  updateContext(key: string, value: any): void;
  getContext(): Record<string, any>;
}

// Agent tool interface
export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  execute(params: Record<string, any>): Promise<any>;
}

// Agent response interface
export interface AgentResponse {
  response: string;
  usedTools?: Array<{
    tool: string;
    input: Record<string, any>;
    output: any;
  }>;
  thinking?: string;
  confidence?: number;
  tokensUsed?: {
    input: number;
    output: number;
    total: number;
  };
  executionTime?: number;
}

/**
 * Agent class for handling different types of AI agents
 */
export class Agent {
  private type: AgentType;
  private capabilities: AgentCapabilities;
  private systemPrompt: string;
  private maxTokens: number;
  private temperature: number;
  private tools: AgentTool[];
  private memory: AgentMemory;
  
  /**
   * Create a new agent
   */
  constructor(options: AgentOptions) {
    this.type = options.agentType;
    this.capabilities = options.capabilities || {};
    this.systemPrompt = this.buildSystemPrompt(options);
    this.maxTokens = options.maxTokens || 1024;
    this.temperature = options.temperature || 0.7;
    this.tools = options.tools || [];
    this.memory = options.memory || this.createDefaultMemory();
  }
  
  /**
   * Process a query with the agent
   */
  public async process(query: string, contextData?: Record<string, any>): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Update memory with user query
      this.memory.addEntry('user', query);
      
      // Update context if provided
      if (contextData) {
        Object.entries(contextData).forEach(([key, value]) => {
          this.memory.updateContext(key, value);
        });
      }
      
      // Prepare conversation history for the model
      const messages = this.prepareMessages();
      
      // Process with LLM
      const result = await this.processWithLLM(messages);
      
      // Extract tools usage if needed
      const toolResults = await this.handleToolCalls(result.content);
      
      // Update memory with assistant response
      this.memory.addEntry('assistant', result.content);
      
      // Prepare response
      const response: AgentResponse = {
        response: result.content,
        usedTools: toolResults,
        tokensUsed: {
          input: 0, // Anthropic doesn't provide token counts directly
          output: 0,
          total: 0
        },
        executionTime: Date.now() - startTime
      };
      
      return response;
    } catch (error) {
      log(`Agent error: ${error}`, 'agent');
      throw new Error(`Agent processing failed: ${error}`);
    }
  }
  
  /**
   * Process with the LLM
   */
  private async processWithLLM(messages: Array<{role: string, content: string}>): Promise<{content: string}> {
    try {
      const response = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: this.systemPrompt,
        messages: messages as any
      });
      
      return { content: response.content[0].text };
    } catch (error) {
      log(`LLM error: ${error}`, 'agent');
      throw new Error(`LLM processing failed: ${error}`);
    }
  }
  
  /**
   * Prepare messages from memory for the LLM
   */
  private prepareMessages(): Array<{role: string, content: string}> {
    return this.memory.getRecentConversation(10);
  }
  
  /**
   * Handle tool calls that might be in the model's response
   */
  private async handleToolCalls(content: string): Promise<Array<{tool: string, input: Record<string, any>, output: any}> | undefined> {
    if (!this.capabilities.useTools || this.tools.length === 0) {
      return undefined;
    }
    
    const toolResults: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Simple pattern matching for tool calls in the format:
    // [TOOL_CALL:tool_name]{"param1": "value1", ...}[/TOOL_CALL]
    const toolCallPattern = /\[TOOL_CALL:(\w+)\](.*?)\[\/TOOL_CALL\]/gs;
    let match;
    
    while ((match = toolCallPattern.exec(content)) !== null) {
      const toolName = match[1];
      const toolInput = match[2];
      
      const tool = this.tools.find(t => t.name === toolName);
      if (tool) {
        try {
          const params = JSON.parse(toolInput);
          const result = await tool.execute(params);
          
          toolResults.push({
            tool: toolName,
            input: params,
            output: result
          });
        } catch (error) {
          log(`Tool execution error: ${error}`, 'agent');
        }
      }
    }
    
    return toolResults.length > 0 ? toolResults : undefined;
  }
  
  /**
   * Build system prompt based on agent type and capabilities
   */
  private buildSystemPrompt(options: AgentOptions): string {
    let basePrompt = `You are an AI assistant in the SynthralOS platform, functioning as a ${options.agentType} agent.`;
    
    switch (options.agentType) {
      case AgentType.ASSISTANT:
        basePrompt += ` Your goal is to assist users with their questions and tasks in a helpful, harmless, and honest manner.`;
        break;
      case AgentType.RESEARCHER:
        basePrompt += ` Your goal is to gather, summarize, and present information on any given topic. Provide comprehensive and accurate information, citing sources where possible.`;
        break;
      case AgentType.ANALYZER:
        basePrompt += ` Your goal is to analyze data, identify patterns, and provide insights. Be thorough, accurate, and data-driven in your analysis.`;
        break;
      case AgentType.EXECUTOR:
        basePrompt += ` Your goal is to execute tasks accurately and efficiently based on given instructions. Provide clear step-by-step explanations of your process.`;
        break;
      case AgentType.COORDINATOR:
        basePrompt += ` Your goal is to coordinate and orchestrate tasks among multiple agents or components. Ensure efficient workflow, proper task allocation, and effective collaboration.`;
        break;
      case AgentType.SPECIALIST:
        const specialization = options.capabilities?.specialization || 'general domain';
        basePrompt += ` Your goal is to provide expert-level assistance in the ${specialization}. Leverage your specialized knowledge to solve complex problems in this domain.`;
        break;
      case AgentType.AUTONOMOUS:
        basePrompt += ` Your goal is to autonomously plan, reason, and execute tasks with minimal human input. Break down complex tasks, make decisions, and adapt to new information as needed.`;
        break;
    }
    
    // Add capability-specific instructions
    if (options.capabilities?.useTools) {
      basePrompt += `\n\nYou have access to the following tools:\n`;
      this.tools.forEach(tool => {
        basePrompt += `- ${tool.name}: ${tool.description}\n`;
      });
      basePrompt += `\nTo use a tool, format your message as:\n[TOOL_CALL:tool_name]{"param1": "value1", ...}[/TOOL_CALL]`;
    }
    
    if (options.capabilities?.multiStep) {
      basePrompt += `\n\nFor complex queries, break down your thinking into steps and show your reasoning process before providing the final answer.`;
    }
    
    if (options.capabilities?.memory) {
      basePrompt += `\n\nYou have access to memory from previous interactions. Use this context to provide consistent and relevant responses.`;
    }
    
    if (options.capabilities?.autonomous) {
      basePrompt += `\n\nYou can operate autonomously to achieve goals. When given a task, develop a plan, execute it step by step, and adapt as needed based on results and feedback.`;
    }
    
    if (options.capabilities?.multiAgent) {
      basePrompt += `\n\nYou can coordinate with other agents to complete complex tasks. Consider which types of agents would be most suitable for different subtasks.`;
    }
    
    if (options.capabilities?.supervisionRequired) {
      basePrompt += `\n\nYour actions require human supervision. For critical decisions or when uncertain, explain your options and request user confirmation before proceeding.`;
    }
    
    // Add custom system prompt if provided
    if (options.systemPrompt) {
      basePrompt += `\n\n${options.systemPrompt}`;
    }
    
    return basePrompt;
  }
  
  /**
   * Create default memory storage
   */
  private createDefaultMemory(): AgentMemory {
    return {
      conversations: [],
      context: {},
      
      addEntry(role: 'user' | 'assistant' | 'system', content: string) {
        this.conversations.push({
          role,
          content,
          timestamp: new Date()
        });
      },
      
      getRecentConversation(limit = 10) {
        return this.conversations
          .slice(-limit)
          .map(entry => ({
            role: entry.role,
            content: entry.content
          }));
      },
      
      updateContext(key: string, value: any) {
        if (!this.context) {
          this.context = {};
        }
        this.context[key] = value;
      },
      
      getContext() {
        return this.context || {};
      }
    };
  }
}

/**
 * AgentFactory to create different types of agents
 */
export class AgentFactory {
  /**
   * Create an agent by type
   */
  public static createAgent(agentType: AgentType | string, options: Partial<AgentOptions> = {}): Agent {
    // Map string to enum if needed
    const type = typeof agentType === 'string' ? agentType as AgentType : agentType;
    
    switch(type) {
      case AgentType.ASSISTANT:
        return this.createAssistant(options);
      case AgentType.RESEARCHER:
        return this.createResearcher(options);
      case AgentType.ANALYZER:
        return this.createAnalyzer(options);
      case AgentType.EXECUTOR:
        return this.createExecutor(options);
      case AgentType.COORDINATOR:
        return this.createCoordinator(options);
      case AgentType.SPECIALIST:
        return this.createSpecialist(options.specialization || 'general', options);
      case AgentType.AUTONOMOUS:
        return this.createAutonomous(options);
      default:
        // Default to assistant if type not recognized
        return this.createAssistant(options);
    }
  }

  /**
   * Create a basic assistant agent
   */
  public static createAssistant(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.ASSISTANT,
      capabilities: {
        multiStep: true,
        memory: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create a researcher agent
   */
  public static createResearcher(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.RESEARCHER,
      capabilities: {
        multiStep: true,
        useTools: true,
        memory: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.3,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create an analyzer agent
   */
  public static createAnalyzer(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.ANALYZER,
      capabilities: {
        multiStep: true,
        useTools: true,
        memory: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.2,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create an executor agent
   */
  public static createExecutor(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.EXECUTOR,
      capabilities: {
        useTools: true,
        memory: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.2,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create a coordinator agent
   */
  public static createCoordinator(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.COORDINATOR,
      capabilities: {
        multiStep: true,
        useTools: true,
        memory: true,
        multiAgent: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.5,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create a specialist agent
   */
  public static createSpecialist(specialization: string, options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.SPECIALIST,
      capabilities: {
        multiStep: true,
        useTools: true,
        memory: true,
        specialization,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 2048,
      temperature: options.temperature || 0.4,
      tools: options.tools,
      memory: options.memory
    });
  }
  
  /**
   * Create an autonomous agent
   */
  public static createAutonomous(options: Partial<AgentOptions> = {}): Agent {
    return new Agent({
      agentType: AgentType.AUTONOMOUS,
      capabilities: {
        multiStep: true,
        useTools: true,
        memory: true,
        autonomous: true,
        ...options.capabilities
      },
      systemPrompt: options.systemPrompt,
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.6,
      tools: options.tools,
      memory: options.memory
    });
  }
}