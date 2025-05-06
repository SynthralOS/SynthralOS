/**
 * Camel-AI Protocol Implementation
 * 
 * Implements the Camel-AI protocol for two-agent collaborative roleplaying.
 * Specializes in creative problem-solving through agent-agent interaction.
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

// Agent roles
interface AgentRole {
  name: string;
  description: string;
  expertise: string[];
  constraints?: string[];
}

// Conversation message
interface ConversationMessage {
  role: string;
  content: string;
  timestamp: string;
}

export class CamelAIProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Camel-AI, a collaborative agent framework specialized in agent-agent roleplaying for creative problem solving. 
    
You excel at:
1. Creating natural agent-agent dialogues with distinct personalities
2. Facilitating collaborative problem-solving between specialized agents
3. Maintaining coherent conversations with knowledge sharing
4. Creating complementary agent roles for specific tasks
5. Leveraging roleplay to generate creative solutions`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.COLLABORATION,
      ProtocolCapabilities.ROLE_PLAYING,
      ProtocolCapabilities.TOOL_USE
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Collaboration state
  private agent1: AgentRole | null = null;
  private agent2: AgentRole | null = null;
  private conversation: ConversationMessage[] = [];
  private taskDescription: string = '';
  private solutionState: {
    inProgress: boolean;
    solution?: string;
    reasoning?: string;
  } = {
    inProgress: true
  };

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Camel-AI',
      version: '1.0.0',
      description: 'Two-agent collaboration roleplay (for creative tasks)',
      capabilities: [
        ProtocolCapabilities.COLLABORATION,
        ProtocolCapabilities.ROLE_PLAYING,
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
    
    // Reset collaboration state
    this.agent1 = null;
    this.agent2 = null;
    this.conversation = [];
    this.taskDescription = '';
    this.solutionState = { inProgress: true };
    
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
          name: 'Agent Role Creation',
          description: 'Designing complementary agent roles for the task',
          status: 'started'
        });
      }

      // Step 1: Create agent roles
      const roles = await this.createAgentRoles(options.task, options);
      this.agent1 = roles.agent1;
      this.agent2 = roles.agent2;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Role Creation',
          description: 'Agent roles designed successfully',
          output: roles,
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Collaborative Dialogue',
          description: 'Starting agent-agent conversation',
          status: 'started'
        });
      }

      // Step 2: Initiate conversation
      await this.runConversation(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Collaborative Dialogue',
          description: 'Agent conversation completed',
          output: {
            messageCount: this.conversation.length,
            solutionFound: !this.solutionState.inProgress
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Solution Synthesis',
          description: 'Synthesizing final solution from conversation',
          status: 'started'
        });
      }

      // Step 3: Extract solution
      const solution = await this.extractSolution(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Solution Synthesis',
          description: 'Final solution synthesized',
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.formatFinalResponse(solution);
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'camelai',
        metadata: {
          agent1: this.agent1,
          agent2: this.agent2,
          messageCount: this.conversation.length,
          solution: solution
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Camel-AI Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Create complementary agent roles based on the task
   */
  private async createAgentRoles(task: string, options: ProtocolExecutionOptions): Promise<{agent1: AgentRole, agent2: AgentRole}> {
    // Generate the role creation prompt
    const rolePrompt = `As Camel-AI, design two complementary agent roles for collaborative problem solving on the following task:

Task: ${task}

Create two agent roles with different expertise, perspectives, and capabilities that can work together effectively to solve this task.

For each agent role, provide:
1. A role name (e.g., "Financial Analyst", "UX Designer")
2. A brief description of the role
3. Key areas of expertise (3-5 areas)
4. Optional constraints or limitations

Respond with a JSON object in this format:
{
  "agent1": {
    "name": "Role Name 1",
    "description": "Brief description of role 1",
    "expertise": ["expertise1", "expertise2", "expertise3"]
  },
  "agent2": {
    "name": "Role Name 2",
    "description": "Brief description of role 2",
    "expertise": ["expertise1", "expertise2", "expertise3"]
  }
}`;

    // Get response from the LLM
    const roleResponse = await this.getResponseFromLLM(rolePrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = roleResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const roles = JSON.parse(jsonMatch[0]);
        
        // Validate the roles object
        if (!roles.agent1 || !roles.agent2 || 
            !roles.agent1.name || !roles.agent2.name ||
            !Array.isArray(roles.agent1.expertise) || !Array.isArray(roles.agent2.expertise)) {
          throw new Error('Invalid agent roles format');
        }
        
        return {
          agent1: roles.agent1 as AgentRole,
          agent2: roles.agent2 as AgentRole
        };
      }
      
      throw new Error('Could not parse agent roles from response');
    } catch (error) {
      log(`Error creating agent roles: ${error}`, 'agent');
      
      // Create default roles based on the task
      const taskWords = task.toLowerCase().split(/\s+/);
      
      // Extract potential role keywords
      const domainWords = taskWords.filter(word => word.length > 5);
      
      return {
        agent1: {
          name: `${domainWords[0] || 'Domain'} Expert`,
          description: `Expert in ${domainWords[0] || 'the specific domain'} with deep technical knowledge`,
          expertise: ['Technical knowledge', 'Domain expertise', 'Analytical thinking']
        },
        agent2: {
          name: 'Creative Problem Solver',
          description: 'Innovative thinker who excels at finding novel solutions',
          expertise: ['Creative thinking', 'Lateral thinking', 'User perspective']
        }
      };
    }
  }

  /**
   * Run the conversation between the two agents
   */
  private async runConversation(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.agent1 || !this.agent2) {
      throw new Error('Agent roles not defined');
    }
    
    // Maximum number of turns (messages) in the conversation
    const maxTurns = 10;
    
    // Add the initial system message to start the conversation
    this.addSystemMessage(`Task: ${this.taskDescription}\n\nThe two agents will now collaborate to solve this task.`);
    
    // Initiate the conversation with the first agent
    await this.generateAgentMessage(this.agent1, options);
    
    // Continue the conversation until a solution is found or max turns reached
    for (let turn = 1; turn < maxTurns; turn++) {
      // Alternate between agents
      const currentAgent = turn % 2 === 0 ? this.agent1 : this.agent2;
      
      // Generate the next message
      await this.generateAgentMessage(currentAgent!, options);
      
      // Check if a solution has been found
      if (!this.solutionState.inProgress) {
        break;
      }
    }
    
    // Add a final system message if no solution was found
    if (this.solutionState.inProgress) {
      this.addSystemMessage('The conversation has reached its maximum length. Let\'s extract the best solution so far.');
    }
  }

  /**
   * Generate a message from an agent
   */
  private async generateAgentMessage(agent: AgentRole, options: ProtocolExecutionOptions): Promise<void> {
    // Generate the agent prompt
    const agentPrompt = this.generateAgentPrompt(agent);
    
    // Check for potential tool usage
    const requiresTool = this.checkIfMessageRequiresTool(
      this.conversation.length > 0 ? this.conversation[this.conversation.length - 1].content : this.taskDescription
    );
    
    let message: string;
    
    if (requiresTool && this.availableTools.length > 0) {
      // Generate a message that uses a tool
      message = await this.generateMessageWithTool(agent, agentPrompt, options);
    } else {
      // Generate a standard message
      message = await this.getResponseFromLLM(agentPrompt);
    }
    
    // Add the message to the conversation
    this.addAgentMessage(agent.name, message);
    
    // Check if a solution has been reached
    if (this.checkForSolution(message)) {
      this.solutionState.inProgress = false;
    }
  }

  /**
   * Generate a prompt for an agent
   */
  private generateAgentPrompt(agent: AgentRole): string {
    let prompt = `You are playing the role of ${agent.name}, who is ${agent.description}.\n\n`;
    prompt += `Your areas of expertise are: ${agent.expertise.join(', ')}.\n\n`;
    
    if (agent.constraints && agent.constraints.length > 0) {
      prompt += `Your limitations or constraints are: ${agent.constraints.join(', ')}.\n\n`;
    }
    
    prompt += `You are collaborating with ${this.conversation.length % 2 === 0 ? this.agent2!.name : this.agent1!.name} to solve this task: ${this.taskDescription}\n\n`;
    
    prompt += `Here is the conversation so far:\n\n`;
    
    for (const message of this.conversation) {
      prompt += `${message.role}: ${message.content}\n\n`;
    }
    
    prompt += `As ${agent.name}, generate your next response in the conversation. 
    
- Stay in character as ${agent.name}
- Build on the previous messages
- If a solution is becoming clear, work towards finalizing it
- Respond as if you are speaking directly to the other agent
- Be concise but thorough`;
    
    return prompt;
  }

  /**
   * Check if the message suggests a need for a tool
   */
  private checkIfMessageRequiresTool(message: string): boolean {
    // Check if the message mentions specific tasks that could use a tool
    const toolKeywords = [
      'calculate', 'compute', 'analyze', 'data', 'search',
      'find information', 'look up', 'research', 'fetch',
      'gather data', 'collect information'
    ];
    
    return toolKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  /**
   * Generate a message that uses a tool
   */
  private async generateMessageWithTool(agent: AgentRole, basePrompt: string, options: ProtocolExecutionOptions): Promise<string> {
    // Enhance the base prompt to encourage tool use
    let toolPromptText = `${basePrompt}\n\nYou have access to the following tools that can help with this task:\n\n`;
    
    // List available tools
    const tools = this.availableTools;
    tools.forEach(tool => {
      toolPromptText += `- ${tool.name}: ${tool.description}\n`;
    });
    
    toolPromptText += `\nIf appropriate for your response, you can suggest using one of these tools to help solve the task. Format your tool usage suggestion like this: "I suggest we use the [tool name] to [purpose]". Do not try to execute the tool directly.`;
    
    // Generate a response that mentions a tool
    const toolResponse = await this.getResponseFromLLM(toolPromptText);
    
    // Check if the response suggests using a specific tool
    const toolMatch = /use the (\w+) tool|use (\w+) to|using (\w+) for/i.exec(toolResponse);
    
    if (toolMatch) {
      const suggestedToolName = (toolMatch[1] || toolMatch[2] || toolMatch[3]).toLowerCase();
      
      // Find the matching tool
      const matchingTool = tools.find(tool => 
        tool.name.toLowerCase().includes(suggestedToolName) || 
        suggestedToolName.includes(tool.name.toLowerCase())
      );
      
      if (matchingTool) {
        // Generate tool input parameters
        const toolInputs = await this.generateToolInputs(agent, matchingTool, options);
        
        try {
          // Call onToolUse callback if provided
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: matchingTool.name,
              input: toolInputs,
              output: undefined,
              error: undefined
            });
          }
          
          // Execute the tool
          const toolResult = await matchingTool.execute(toolInputs);
          
          // Update the tool use callback with the result
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: matchingTool.name,
              input: toolInputs,
              output: toolResult,
              error: undefined
            });
          }
          
          // Generate a response that incorporates the tool result
          const resultPrompt = `${basePrompt}\n\nYou used the ${matchingTool.name} tool with the following inputs:\n${JSON.stringify(toolInputs, null, 2)}\n\nThe tool returned this result:\n${JSON.stringify(toolResult, null, 2)}\n\nIncorporate this information into your response as ${agent.name}, making sure to interpret the tool results and explain their significance to the other agent in the context of solving the task.`;
          
          // Get response that incorporates the tool result
          return await this.getResponseFromLLM(resultPrompt);
        } catch (error) {
          // Handle tool execution error
          log(`Tool execution error: ${error}`, 'agent');
          
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: matchingTool.name,
              input: toolInputs,
              output: undefined,
              error: (error as Error).message
            });
          }
          
          // Generate a response that acknowledges the tool error
          const errorPrompt = `${basePrompt}\n\nYou attempted to use the ${matchingTool.name} tool, but encountered an error: ${(error as Error).message}\n\nAs ${agent.name}, acknowledge this issue in your response and suggest an alternative approach that doesn't rely on this tool.`;
          
          return await this.getResponseFromLLM(errorPrompt);
        }
      }
    }
    
    // If no specific tool was matched or suggested, return the original response
    return toolResponse;
  }

  /**
   * Generate inputs for a tool
   */
  private async generateToolInputs(agent: AgentRole, tool: AgentTool, options: ProtocolExecutionOptions): Promise<Record<string, any>> {
    // Create a prompt to generate tool inputs
    const inputPrompt = `As ${agent.name}, you need to use the "${tool.name}" tool to help solve this task: "${this.taskDescription}".

The tool requires the following parameters:
${Object.entries(tool.parameters).map(([name, info]) => 
  `- ${name} (${info.type}${info.required ? ', required' : ''}): ${info.description}`
).join('\n')}

Based on the conversation so far and the current state of the task, generate appropriate values for these parameters.
Respond with a JSON object containing only the parameter values:
{
  ${Object.keys(tool.parameters).map(param => `"${param}": "value"`).join(',\n  ')}
}`;

    // Get response from the LLM
    const inputResponse = await this.getResponseFromLLM(inputPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = inputResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Could not parse tool inputs JSON');
    } catch (error) {
      log(`Error generating tool inputs: ${error}`, 'agent');
      
      // Create default parameters
      const defaultParams: Record<string, any> = {};
      
      // Set required parameters to empty values based on type
      Object.entries(tool.parameters).forEach(([name, info]) => {
        if (info.required) {
          switch (info.type) {
            case 'string':
              defaultParams[name] = '';
              break;
            case 'number':
              defaultParams[name] = 0;
              break;
            case 'boolean':
              defaultParams[name] = false;
              break;
            case 'object':
              defaultParams[name] = {};
              break;
            case 'array':
              defaultParams[name] = [];
              break;
            default:
              defaultParams[name] = '';
          }
        }
      });
      
      return defaultParams;
    }
  }

  /**
   * Add a system message to the conversation
   */
  private addSystemMessage(content: string): void {
    this.conversation.push({
      role: 'System',
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Add an agent message to the conversation
   */
  private addAgentMessage(agentName: string, content: string): void {
    this.conversation.push({
      role: agentName,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Check if a message contains a solution
   */
  private checkForSolution(message: string): boolean {
    // Look for solution indicators in the message
    const solutionIndicators = [
      "here's our solution",
      "our final solution",
      "proposed solution",
      "I believe we have solved",
      "our answer is",
      "we've come up with",
      "our joint solution"
    ];
    
    for (const indicator of solutionIndicators) {
      if (message.toLowerCase().includes(indicator)) {
        // Extract the solution section
        const solutionMatch = new RegExp(`${indicator}[:\\s]+(.*?)(?=\\n\\n|$)`, 'i').exec(message);
        
        if (solutionMatch) {
          this.solutionState.solution = solutionMatch[1].trim();
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Extract the final solution from the conversation
   */
  private async extractSolution(options: ProtocolExecutionOptions): Promise<{solution: string, reasoning: string}> {
    // If a solution was already identified during conversation, use it
    if (this.solutionState.solution) {
      // Generate reasoning for the solution
      const reasoningPrompt = `Based on the collaborative conversation between ${this.agent1!.name} and ${this.agent2!.name}, a solution has been identified:

${this.solutionState.solution}

Analyze this solution for the task: "${this.taskDescription}"

Provide a concise explanation of:
1. Why this solution effectively addresses the task
2. How the collaboration between the agents contributed to this solution
3. Any key insights or innovations from the conversation

Format your response as a concise paragraph (3-5 sentences) that explains the reasoning behind this solution.`;

      // Get reasoning from the LLM
      const reasoning = await this.getResponseFromLLM(reasoningPrompt);
      
      return {
        solution: this.solutionState.solution,
        reasoning
      };
    } else {
      // Need to extract solution from the conversation
      const extractPrompt = `Review the following conversation between ${this.agent1!.name} and ${this.agent2!.name} collaborating on this task:

"${this.taskDescription}"

Conversation:
${this.conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n\n')}

Extract and synthesize the best solution from this conversation, even if it wasn't explicitly stated as a final solution.

Respond with a JSON object in this format:
{
  "solution": "Clear description of the solution",
  "reasoning": "Explanation of why this is the best solution and how it addresses the task"
}`;

      // Get solution extraction from the LLM
      const extractionResponse = await this.getResponseFromLLM(extractPrompt);
      
      try {
        // Extract JSON from the response
        const jsonMatch = extractionResponse.match(/{[\s\S]*?}/);
        if (jsonMatch) {
          const extraction = JSON.parse(jsonMatch[0]);
          
          // Validate the extraction object
          if (!extraction.solution || !extraction.reasoning) {
            throw new Error('Invalid solution extraction format');
          }
          
          return {
            solution: extraction.solution,
            reasoning: extraction.reasoning
          };
        }
        
        throw new Error('Could not parse solution extraction JSON');
      } catch (error) {
        log(`Error extracting solution: ${error}`, 'agent');
        
        // Create a default extraction
        return {
          solution: "A solution could not be properly extracted from the conversation.",
          reasoning: "The agent dialogue explored various aspects of the problem but did not converge on a clear solution."
        };
      }
    }
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(solution: {solution: string, reasoning: string}): string {
    let response = `# Camel-AI Collaborative Solution\n\n`;
    
    // Task section
    response += `## Task\n${this.taskDescription}\n\n`;
    
    // Agent roles section
    response += `## Collaborating Agents\n`;
    if (this.agent1) {
      response += `### ${this.agent1.name}\n`;
      response += `${this.agent1.description}\n`;
      response += `**Expertise:** ${this.agent1.expertise.join(', ')}\n\n`;
    }
    if (this.agent2) {
      response += `### ${this.agent2.name}\n`;
      response += `${this.agent2.description}\n`;
      response += `**Expertise:** ${this.agent2.expertise.join(', ')}\n\n`;
    }
    
    // Solution section
    response += `## Solution\n${solution.solution}\n\n`;
    
    // Reasoning section
    response += `## Reasoning\n${solution.reasoning}\n\n`;
    
    // Conversation highlights section
    response += `## Conversation Highlights\n`;
    
    // Only include a subset of the conversation (key moments)
    const highlights = this.extractConversationHighlights();
    highlights.forEach((msg, idx) => {
      response += `### Exchange ${idx + 1}\n`;
      response += `**${msg.role}:** ${msg.content}\n\n`;
    });
    
    return response;
  }

  /**
   * Extract highlights from the conversation
   */
  private extractConversationHighlights(): ConversationMessage[] {
    const highlights: ConversationMessage[] = [];
    
    // Include system message if present
    if (this.conversation[0]?.role === 'System') {
      highlights.push(this.conversation[0]);
    }
    
    // Include first exchange
    if (this.conversation.length > 1) {
      highlights.push(this.conversation[1]);
    }
    if (this.conversation.length > 2) {
      highlights.push(this.conversation[2]);
    }
    
    // Include middle exchange if conversation is long enough
    const midIdx = Math.floor(this.conversation.length / 2);
    if (this.conversation.length > 5 && midIdx > 2) {
      highlights.push(this.conversation[midIdx]);
      if (midIdx + 1 < this.conversation.length) {
        highlights.push(this.conversation[midIdx + 1]);
      }
    }
    
    // Include last exchange
    if (this.conversation.length > 3) {
      highlights.push(this.conversation[this.conversation.length - 2]);
      highlights.push(this.conversation[this.conversation.length - 1]);
    }
    
    return highlights;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // In a real implementation, we would track tool calls during execution
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
    // Reset collaboration state
    this.agent1 = null;
    this.agent2 = null;
    this.conversation = [];
    this.taskDescription = '';
    this.solutionState = { inProgress: true };
    this.initialized = false;
    
    return Promise.resolve();
  }
}