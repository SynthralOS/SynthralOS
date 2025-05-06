/**
 * MetaGPT Protocol Implementation
 * 
 * Implements the MetaGPT protocol for role-based agent teams.
 * Supports multi-agent collaboration with specialized roles.
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

// Role type for MetaGPT
export interface MetaGPTRole {
  name: string;
  description: string;
  responsibilities: string[];
  systemPrompt: string;
  tools?: string[]; // Names of tools this role can use
}

// Message type for inter-agent communication
export interface MetaGPTMessage {
  id: string;
  from: string;
  to: string | 'all';
  content: string;
  timestamp: Date;
  replyTo?: string;
}

// Default roles
const DEFAULT_ROLES: MetaGPTRole[] = [
  {
    name: 'ProjectManager',
    description: 'Manages the overall project, delegates tasks, and ensures goals are met',
    responsibilities: [
      'Break down the main task into subtasks',
      'Assign subtasks to appropriate roles',
      'Monitor progress and provide guidance',
      'Ensure the final deliverable meets requirements',
      'Coordinate team communication'
    ],
    systemPrompt: 'You are a Project Manager responsible for coordinating a team of specialized agents. Your job is to break down complex tasks, delegate effectively, and ensure the team delivers high-quality results on time.'
  },
  {
    name: 'Developer',
    description: 'Implements technical solutions and writes code',
    responsibilities: [
      'Write code to solve technical problems',
      'Debug and fix issues',
      'Implement features according to specifications',
      'Optimize performance',
      'Ensure code quality and maintainability'
    ],
    systemPrompt: 'You are a Developer responsible for implementing technical solutions. Your expertise is in writing clean, efficient code and solving technical challenges.'
  },
  {
    name: 'QA',
    description: 'Tests implementations and ensures quality',
    responsibilities: [
      'Test implementations for bugs and issues',
      'Verify that requirements are met',
      'Identify edge cases and potential problems',
      'Provide feedback for improvements',
      'Ensure overall product quality'
    ],
    systemPrompt: 'You are a Quality Assurance specialist responsible for testing implementations. Your expertise is in finding bugs, identifying edge cases, and ensuring product quality.'
  },
  {
    name: 'Researcher',
    description: 'Gathers information and provides domain expertise',
    responsibilities: [
      'Research relevant topics and provide insights',
      'Gather data and information',
      'Analyze information and identify patterns',
      'Provide domain expertise',
      'Support decision-making with evidence'
    ],
    systemPrompt: 'You are a Researcher responsible for gathering and analyzing information. Your expertise is in finding relevant data, providing insights, and supporting the team with domain knowledge.'
  }
];

export class MetaGPTProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are participating in a multi-agent team with specialized roles to solve complex problems collaboratively.',
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
    roles: DEFAULT_ROLES,
    maxRounds: 10, // Maximum number of interaction rounds
    memoryEnabled: true, // Whether agents have memory of past interactions
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private roles: MetaGPTRole[] = [];
  private messages: MetaGPTMessage[] = [];
  private currentRound: number = 0;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'MetaGPT',
      version: '1.0.0',
      description: 'Protocol for role-based agent teams (PM, Developer, QA agent team)',
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
    
    // Set up roles
    this.roles = this.config.roles as MetaGPTRole[] || DEFAULT_ROLES;
    
    // Reset execution state
    this.messages = [];
    this.currentRound = 0;
    
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

      // Initialize the collaboration
      await this.startCollaboration(options.task, options);
      
      // Run the collaboration rounds
      const finalOutput = await this.runCollaborationRounds(options);
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: finalOutput.summary,
        usedTools: finalOutput.toolExecutions,
        thinking: this.getCollaborationTranscript(),
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`MetaGPT Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Start the collaboration with a task briefing from the Project Manager
   */
  private async startCollaboration(task: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Find the Project Manager role
    const pmRole = this.roles.find(role => role.name === 'ProjectManager');
    
    if (!pmRole) {
      throw new Error('Project Manager role not found');
    }

    // Prepare system prompt for the Project Manager's initial briefing
    const pmInitialPrompt = `${pmRole.systemPrompt}

You are starting a new project with the following team members:
${this.roles.filter(role => role.name !== 'ProjectManager').map(role => `- ${role.name}: ${role.description}`).join('\n')}

Your task is to:
1. Analyze the given task
2. Break it down into subtasks
3. Assign each subtask to the appropriate team member
4. Provide an initial plan and timeline
5. Set expectations for collaboration

Please provide a comprehensive briefing to the team that introduces the task, explains your plan, and gives clear instructions to each team member.

Task: ${task}`;

    // Generate the initial briefing
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: pmInitialPrompt,
      messages: [{ role: 'user', content: `Create an initial project briefing for the task: ${task}` }]
    });
    
    // Add the initial briefing as a message from the PM to all
    this.addMessage('ProjectManager', 'all', response.content[0].text);
    
    // Call onStep callback if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Project Briefing',
        description: 'Initial project briefing from the Project Manager',
        output: response.content[0].text,
        status: 'completed'
      });
    }
  }

  /**
   * Run the collaboration rounds
   */
  private async runCollaborationRounds(options: ProtocolExecutionOptions): Promise<{
    summary: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    const tools = options.tools || this.availableTools;
    const maxRounds = this.config.maxRounds as number;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Run the collaboration for a fixed number of rounds
    for (this.currentRound = 1; this.currentRound <= maxRounds; this.currentRound++) {
      // Call onStep callback for round start if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Round ${this.currentRound}`,
          description: `Starting collaboration round ${this.currentRound}`,
          status: 'started'
        });
      }
      
      // Get responses from each role
      for (const role of this.roles) {
        try {
          if (this.currentRound === 1 && role.name === 'ProjectManager') {
            // Skip PM in first round as they already provided the briefing
            continue;
          }
          
          // Generate a response from this role
          const roleResponse = await this.generateRoleResponse(role, tools, options);
          
          // Add any tool executions
          if (roleResponse.toolExecution) {
            toolExecutions.push(roleResponse.toolExecution);
          }
          
          // Add the response as a message
          this.addMessage(role.name, roleResponse.to, roleResponse.content);
          
          // Call onStep callback for role response if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: `${role.name} Response`,
              description: `Response from ${role.name} in round ${this.currentRound}`,
              output: roleResponse.content,
              status: 'completed'
            });
          }
        } catch (error) {
          log(`Error generating response for ${role.name}: ${error}`, 'agent');
          
          // Add a message indicating the error
          this.addMessage(role.name, 'all', `I encountered an error: ${(error as Error).message}`);
          
          // Call onStep callback with error if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: `${role.name} Response`,
              description: `Response from ${role.name} in round ${this.currentRound}`,
              error: (error as Error).message,
              status: 'failed'
            });
          }
        }
      }
      
      // Check if the collaboration should end
      if (await this.shouldEndCollaboration()) {
        break;
      }
    }
    
    // Generate a final summary from the Project Manager
    const summary = await this.generateFinalSummary(options.task);
    
    // Call onStep callback for collaboration end if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Collaboration Complete',
        description: 'The role-based agent collaboration has completed',
        output: summary,
        status: 'completed'
      });
    }
    
    return {
      summary,
      toolExecutions
    };
  }

  /**
   * Generate a response from a specific role
   */
  private async generateRoleResponse(
    role: MetaGPTRole,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    to: string;
    content: string;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Get available tools for this role
    const roleTools = this.getToolsForRole(role, tools);
    
    // Prepare the tools instructions string
    const toolsInstructions = this.getToolsInstructionsString(roleTools);
    
    // Get relevant messages for this role
    const relevantMessages = this.getRelevantMessages(role.name);
    
    // Prepare system prompt for the role
    const rolePrompt = `${role.systemPrompt}

You are participating in a collaborative team working on a task. Your role is: ${role.name}

Your responsibilities:
${role.responsibilities.map(r => `- ${r}`).join('\n')}

Team members:
${this.roles.filter(r => r.name !== role.name).map(r => `- ${r.name}: ${r.description}`).join('\n')}

${toolsInstructions}

Previous messages in the conversation:
${this.formatMessagesForPrompt(relevantMessages)}

Based on the conversation so far, provide a response that:
1. Addresses the latest messages or tasks assigned to you
2. Contributes meaningfully to the collaborative process
3. Utilizes your specific expertise as a ${role.name}
4. Is directed to either a specific team member or the entire team

Respond with a JSON object in the following format:
{
  "reasoning": "Your internal reasoning about how to respond (this will not be shared with the team)",
  "to": "recipient_name or 'all' for everyone",
  "content": "Your actual message to the team",
  "action": {
    "type": "tool_use" OR "direct_response",
    "tool": "tool_name" (if using a tool),
    "input": { ... tool parameters ... } (if using a tool)
  }
}`;

    // Generate the role response
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: rolePrompt,
      messages: [{ 
        role: 'user', 
        content: `Generate a response as ${role.name} for round ${this.currentRound} of the collaboration.`
      }]
    });
    
    // Parse the response
    return await this.parseRoleResponse(response.content[0].text, role.name, roleTools, options);
  }

  /**
   * Parse a role's response
   */
  private async parseRoleResponse(
    content: string,
    roleName: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{
    to: string;
    content: string;
    toolExecution?: {tool: string, input: Record<string, any>, output: any};
  }> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        throw new Error(`Could not extract JSON from ${roleName}'s response`);
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        responseJson = JSON.parse(jsonMatch[1].trim());
      }
      
      const to = responseJson.to || 'all';
      let messageContent = responseJson.content || '';
      
      // Handle tool execution if present
      if (responseJson.action?.type === 'tool_use' && responseJson.action.tool && responseJson.action.input) {
        const toolName = responseJson.action.tool;
        const toolInput = responseJson.action.input;
        
        // Find the tool
        const tool = tools.find(t => t.name === toolName);
        
        if (!tool) {
          throw new Error(`Tool '${toolName}' not found for ${roleName}`);
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
          
          // Add tool result to the message content
          messageContent += `\n\n**Tool Result (${toolName}):**\n\`\`\`\n${JSON.stringify(result, null, 2)}\n\`\`\``;
          
          return {
            to,
            content: messageContent,
            toolExecution: {
              tool: toolName,
              input: toolInput,
              output: result
            }
          };
        } catch (error) {
          // Handle tool execution error
          log(`Error executing ${toolName} for ${roleName}: ${error}`, 'agent');
          
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName,
              input: toolInput,
              output: undefined,
              error: (error as Error).message
            });
          }
          
          // Add error to the message content
          messageContent += `\n\n**Tool Error (${toolName}):**\n\`\`\`\n${(error as Error).message}\n\`\`\``;
          
          return {
            to,
            content: messageContent,
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
        to,
        content: messageContent
      };
    } catch (error) {
      log(`Error parsing ${roleName}'s response: ${error}`, 'agent');
      
      // Return a fallback response
      return {
        to: 'all',
        content: `I attempted to respond but encountered an error: ${(error as Error).message}`
      };
    }
  }

  /**
   * Determine if the collaboration should end
   */
  private async shouldEndCollaboration(): Promise<boolean> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // In the real implementation, you would analyze recent messages
    // to determine if the task is complete or if the collaboration
    // has reached a natural conclusion.
    
    // For simplicity, check if we've reached the maximum number of rounds
    if (this.currentRound >= (this.config.maxRounds as number)) {
      return true;
    }
    
    // If the PM has indicated completion in the last round
    const recentPMMessages = this.messages
      .filter(msg => msg.from === 'ProjectManager')
      .slice(-2);
    
    for (const msg of recentPMMessages) {
      const completionIndicators = [
        'task is complete',
        'we have finished',
        'final deliverable',
        'final result',
        'successfully completed',
        'project is complete'
      ];
      
      if (completionIndicators.some(indicator => msg.content.toLowerCase().includes(indicator))) {
        return true;
      }
    }
    
    // Otherwise, continue collaboration
    return false;
  }

  /**
   * Generate a final summary from the Project Manager
   */
  private async generateFinalSummary(task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Find the Project Manager role
    const pmRole = this.roles.find(role => role.name === 'ProjectManager');
    
    if (!pmRole) {
      throw new Error('Project Manager role not found');
    }

    // Prepare system prompt for the final summary
    const summaryPrompt = `${pmRole.systemPrompt}

As the Project Manager, you are responsible for providing a final summary of the collaborative work done by your team.

Task: ${task}

Team collaboration transcript:
${this.getCollaborationTranscript()}

Please provide a comprehensive final summary that:
1. Recaps the original task and goals
2. Summarizes the approach and methodology used
3. Highlights key contributions from each team member
4. Presents the final deliverable or outcome
5. Notes any challenges faced and how they were addressed
6. Provides any relevant recommendations or next steps

Your summary should be professional, concise, and highlight the successful completion of the task.`;

    // Generate the summary
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5, // Lower temperature for more focused summary
      system: summaryPrompt,
      messages: [{ role: 'user', content: 'Generate the final project summary.' }]
    });
    
    return response.content[0].text;
  }

  /**
   * Add a message to the conversation
   */
  private addMessage(from: string, to: string, content: string): void {
    this.messages.push({
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      from,
      to,
      content,
      timestamp: new Date()
    });
  }

  /**
   * Get relevant messages for a specific role
   */
  private getRelevantMessages(roleName: string): MetaGPTMessage[] {
    // Get messages addressed to this role or to everyone
    return this.messages.filter(msg => 
      msg.to === roleName || 
      msg.to === 'all' || 
      msg.from === roleName
    );
  }

  /**
   * Format messages for inclusion in a prompt
   */
  private formatMessagesForPrompt(messages: MetaGPTMessage[]): string {
    return messages.map(msg => {
      const time = msg.timestamp.toLocaleTimeString();
      return `[${time}] ${msg.from} to ${msg.to === 'all' ? 'Everyone' : msg.to}: ${msg.content}`;
    }).join('\n\n---\n\n');
  }

  /**
   * Get tools available for a specific role
   */
  private getToolsForRole(role: MetaGPTRole, allTools: AgentTool[]): AgentTool[] {
    if (!role.tools || role.tools.length === 0) {
      return allTools; // All tools available if not specified
    }
    
    return allTools.filter(tool => role.tools!.includes(tool.name));
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
   * Get the collaboration transcript
   */
  private getCollaborationTranscript(): string {
    return this.formatMessagesForPrompt(this.messages);
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
    
    // Update roles if provided
    if (config.roles) {
      this.roles = config.roles as MetaGPTRole[];
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
    // Reset collaboration state
    this.messages = [];
    this.currentRound = 0;
    this.initialized = false;
    
    return Promise.resolve();
  }
}