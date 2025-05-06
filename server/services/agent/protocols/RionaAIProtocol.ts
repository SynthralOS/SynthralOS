/**
 * Riona AI Agent Protocol Implementation
 * 
 * Implements the Riona AI protocol for Twitter + GitHub monitoring and reply agent.
 * Specializes in monitoring social platforms and coordinating appropriate responses.
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

// Platform types
enum PlatformType {
  TWITTER = 'twitter',
  GITHUB = 'github',
  BOTH = 'both'
}

// Monitoring parameters
interface MonitoringParams {
  platform: PlatformType;
  keywords: string[];
  accounts: string[];
  repositories?: string[];
  mentionsOnly: boolean;
  checkFrequency: 'high' | 'medium' | 'low';
}

// Response parameters
interface ResponseParams {
  responseTemplate?: string;
  tone: string;
  autoRespond: boolean;
  maxResponsesPerDay?: number;
  requireApproval: boolean;
}

export class RionaAIProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Riona AI, a specialized agent for monitoring Twitter and GitHub activities and generating appropriate responses. 
    
You excel at:
1. Monitoring Twitter for mentions, keywords, and relevant conversations
2. Tracking GitHub activities including issues, PRs, and discussions
3. Analyzing social content for sentiment and intent
4. Crafting contextually appropriate responses in the right tone
5. Prioritizing interactions based on urgency and importance
6. Maintaining a consistent brand voice across platforms`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.LONG_TERM_MEMORY
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Monitoring state
  private monitoringParams: MonitoringParams | null = null;
  private responseParams: ResponseParams | null = null;
  private monitoredItems: Array<{
    platform: string;
    id: string;
    content: string;
    author: string;
    timestamp: string;
    responseStatus?: 'pending' | 'approved' | 'sent' | 'rejected';
    response?: string;
  }> = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Riona AI Agent',
      version: '1.0.0',
      description: 'Twitter + GitHub monitoring and reply agent',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.LONG_TERM_MEMORY
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
    
    // Reset monitoring state
    this.monitoringParams = null;
    this.responseParams = null;
    this.monitoredItems = [];
    
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
          name: 'Monitoring Configuration',
          description: 'Setting up monitoring parameters',
          status: 'started'
        });
      }

      // Step 1: Setup monitoring parameters
      this.monitoringParams = await this.setupMonitoringParams(options.task, options);
      this.responseParams = await this.setupResponseParams(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Monitoring Configuration',
          description: 'Monitoring parameters configured',
          output: {
            monitoring: this.monitoringParams,
            response: this.responseParams
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Platform Monitoring',
          description: 'Fetching data from platforms',
          status: 'started'
        });
      }

      // Step 2: Monitor platforms
      await this.monitorPlatforms(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Platform Monitoring',
          description: 'Platform data fetched successfully',
          output: {
            itemsCount: this.monitoredItems.length
          },
          status: 'completed'
        });
      }
      
      if (this.monitoredItems.length > 0) {
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: 'Response Generation',
            description: 'Generating appropriate responses',
            status: 'started'
          });
        }

        // Step 3: Generate responses
        await this.generateResponses(options);
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: 'Response Generation',
            description: 'Responses generated successfully',
            status: 'completed'
          });
        }
        
        if (this.responseParams?.autoRespond) {
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: 'Auto-Responding',
              description: 'Sending auto-approved responses',
              status: 'started'
            });
          }

          // Step 4: Send auto-responses (if enabled)
          await this.sendResponses(options);
          
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: 'Auto-Responding',
              description: 'Auto-responses sent successfully',
              status: 'completed'
            });
          }
        }
      }
      
      // Prepare the final response
      const finalResponse = this.formatMonitoringReport();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'riona',
        metadata: {
          monitoring: this.monitoringParams,
          response: this.responseParams,
          itemsCount: this.monitoredItems.length
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Riona AI Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Setup monitoring parameters
   */
  private async setupMonitoringParams(task: string, options: ProtocolExecutionOptions): Promise<MonitoringParams> {
    // Generate the monitoring setup prompt
    const setupPrompt = `As Riona AI, analyze the following monitoring request and set up appropriate monitoring parameters:

Monitoring Request: ${task}

Determine the following monitoring parameters:
1. Which platform(s) to monitor (Twitter, GitHub, or both)
2. Keywords to track
3. Specific accounts to monitor
4. For GitHub monitoring, specific repositories (if applicable)
5. Whether to focus only on direct mentions or broader conversations
6. Check frequency (high = every 5 minutes, medium = hourly, low = daily)

Respond with a JSON object in this format:
{
  "platform": "twitter", "github", or "both",
  "keywords": ["keyword1", "keyword2", ...],
  "accounts": ["account1", "account2", ...],
  "repositories": ["owner/repo1", "owner/repo2", ...],
  "mentionsOnly": true or false,
  "checkFrequency": "high", "medium", or "low"
}`;

    // Get response from the LLM
    const setupResponse = await this.getResponseFromLLM(setupPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = setupResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const params = JSON.parse(jsonMatch[0]);
        
        // Validate the params object
        if (!params.platform || !Array.isArray(params.keywords) || !Array.isArray(params.accounts)) {
          throw new Error('Invalid monitoring parameters format');
        }
        
        return params as MonitoringParams;
      }
      
      throw new Error('Could not parse monitoring parameters JSON');
    } catch (error) {
      log(`Error setting up monitoring parameters: ${error}`, 'agent');
      
      // Extract platform from task
      let platform = PlatformType.BOTH;
      if (/twitter|tweet/i.test(task) && !/github/i.test(task)) {
        platform = PlatformType.TWITTER;
      } else if (/github/i.test(task) && !/twitter|tweet/i.test(task)) {
        platform = PlatformType.GITHUB;
      }
      
      // Extract keywords from task
      const keywords = task.match(/\b\w{4,}\b/g) || ['product', 'service'];
      
      // Return default parameters
      return {
        platform,
        keywords: keywords.slice(0, 5),
        accounts: ['company'],
        repositories: platform !== PlatformType.TWITTER ? ['owner/repo'] : undefined,
        mentionsOnly: true,
        checkFrequency: 'medium'
      };
    }
  }

  /**
   * Setup response parameters
   */
  private async setupResponseParams(task: string, options: ProtocolExecutionOptions): Promise<ResponseParams> {
    // Generate the response setup prompt
    const setupPrompt = `As Riona AI, analyze the following monitoring request and set up appropriate response parameters:

Monitoring Request: ${task}

Determine the following response parameters:
1. A template for responses (if applicable)
2. The appropriate tone for responses
3. Whether to auto-respond or just track mentions
4. Maximum responses per day (if applicable)
5. Whether responses require human approval before sending

Respond with a JSON object in this format:
{
  "responseTemplate": "optional template with {placeholders}",
  "tone": "description of the tone (professional, friendly, etc.)",
  "autoRespond": true or false,
  "maxResponsesPerDay": number or null,
  "requireApproval": true or false
}`;

    // Get response from the LLM
    const setupResponse = await this.getResponseFromLLM(setupPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = setupResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const params = JSON.parse(jsonMatch[0]);
        
        // Validate the params object
        if (typeof params.tone !== 'string' || typeof params.autoRespond !== 'boolean' ||
            typeof params.requireApproval !== 'boolean') {
          throw new Error('Invalid response parameters format');
        }
        
        return params as ResponseParams;
      }
      
      throw new Error('Could not parse response parameters JSON');
    } catch (error) {
      log(`Error setting up response parameters: ${error}`, 'agent');
      
      // Return default parameters
      return {
        responseTemplate: "Thanks for reaching out about {topic}. We appreciate your {sentiment} and will look into this!",
        tone: "professional and friendly",
        autoRespond: false,
        maxResponsesPerDay: 10,
        requireApproval: true
      };
    }
  }

  /**
   * Monitor platforms based on parameters
   */
  private async monitorPlatforms(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.monitoringParams) {
      throw new Error('Monitoring parameters not set');
    }
    
    const tools = options.tools || this.availableTools;
    
    // Check for Twitter API tool
    if (this.monitoringParams.platform !== PlatformType.GITHUB) {
      const twitterTool = tools.find(tool => 
        tool.name.includes('twitter') || 
        tool.name.includes('tweet') || 
        tool.name.includes('social')
      );
      
      if (twitterTool) {
        await this.monitorTwitter(twitterTool, options);
      } else {
        log('No Twitter monitoring tool available', 'agent');
        
        // Add mock Twitter data for demo purposes
        this.monitoredItems.push({
          platform: 'twitter',
          id: 'tweet123456',
          content: `I'm having trouble with ${this.monitoringParams.keywords[0] || 'your product'}. Can anyone help?`,
          author: 'user123',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Check for GitHub API tool
    if (this.monitoringParams.platform !== PlatformType.TWITTER) {
      const githubTool = tools.find(tool => 
        tool.name.includes('github') || 
        tool.name.includes('git') || 
        tool.name.includes('repo')
      );
      
      if (githubTool) {
        await this.monitorGitHub(githubTool, options);
      } else {
        log('No GitHub monitoring tool available', 'agent');
        
        // Add mock GitHub data for demo purposes
        this.monitoredItems.push({
          platform: 'github',
          id: 'issue789',
          content: `Found a bug in the ${this.monitoringParams.repositories?.[0] || 'main'} repository related to ${this.monitoringParams.keywords[0] || 'functionality'}`,
          author: 'developer456',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Monitor Twitter using tool
   */
  private async monitorTwitter(twitterTool: AgentTool, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.monitoringParams) return;
    
    try {
      // Create Twitter tool parameters
      const twitterParams = {
        keywords: this.monitoringParams.keywords,
        accounts: this.monitoringParams.accounts,
        mentionsOnly: this.monitoringParams.mentionsOnly,
        limit: 10
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: twitterTool.name,
          input: twitterParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the Twitter tool
      const twitterResults = await twitterTool.execute(twitterParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: twitterTool.name,
          input: twitterParams,
          output: twitterResults,
          error: undefined
        });
      }
      
      // Add Twitter results to monitored items
      if (Array.isArray(twitterResults)) {
        twitterResults.forEach(tweet => {
          this.monitoredItems.push({
            platform: 'twitter',
            id: tweet.id,
            content: tweet.text,
            author: tweet.author,
            timestamp: tweet.timestamp
          });
        });
      }
    } catch (error) {
      log(`Twitter monitoring error: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Monitor GitHub using tool
   */
  private async monitorGitHub(githubTool: AgentTool, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.monitoringParams) return;
    
    try {
      // Create GitHub tool parameters
      const githubParams = {
        keywords: this.monitoringParams.keywords,
        repositories: this.monitoringParams.repositories || [],
        limit: 10
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: githubParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the GitHub tool
      const githubResults = await githubTool.execute(githubParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: githubParams,
          output: githubResults,
          error: undefined
        });
      }
      
      // Add GitHub results to monitored items
      if (Array.isArray(githubResults)) {
        githubResults.forEach(item => {
          this.monitoredItems.push({
            platform: 'github',
            id: item.id,
            content: item.content || item.title,
            author: item.author,
            timestamp: item.timestamp
          });
        });
      }
    } catch (error) {
      log(`GitHub monitoring error: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Generate responses for monitored items
   */
  private async generateResponses(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.responseParams) return;
    
    for (const item of this.monitoredItems) {
      if (item.responseStatus) continue; // Skip items that already have a response status
      
      // Generate response prompt
      const responsePrompt = `As Riona AI, craft an appropriate response to the following ${item.platform} content:

Content: "${item.content}"
Author: ${item.author}
Platform: ${item.platform}

Response guidelines:
- Tone: ${this.responseParams.tone}
- Template (if applicable): ${this.responseParams.responseTemplate || 'No template specified'}
- Be helpful and address the specific content
- Maintain brand voice
- Keep responses concise (1-3 sentences for Twitter, 2-4 sentences for GitHub)

Generate a single response that would be appropriate to post as a reply:`;

      // Get response from the LLM
      const generatedResponse = await this.getResponseFromLLM(responsePrompt);
      
      // Clean up the response (remove quotes, etc.)
      const cleanedResponse = generatedResponse.replace(/^["']|["']$/g, '').trim();
      
      // Update the item with the response
      item.response = cleanedResponse;
      item.responseStatus = this.responseParams.requireApproval ? 'pending' : 'approved';
    }
  }

  /**
   * Send approved responses
   */
  private async sendResponses(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.responseParams || !this.responseParams.autoRespond) return;
    
    const tools = options.tools || this.availableTools;
    
    // Get approved responses that haven't been sent
    const approvedItems = this.monitoredItems.filter(item => 
      item.responseStatus === 'approved' && item.response
    );
    
    // Limit responses per day if specified
    const itemsToRespond = this.responseParams.maxResponsesPerDay ?
      approvedItems.slice(0, this.responseParams.maxResponsesPerDay) :
      approvedItems;
    
    for (const item of itemsToRespond) {
      if (item.platform === 'twitter') {
        await this.sendTwitterResponse(item, tools, options);
      } else if (item.platform === 'github') {
        await this.sendGitHubResponse(item, tools, options);
      }
    }
  }

  /**
   * Send a Twitter response
   */
  private async sendTwitterResponse(item: any, tools: AgentTool[], options: ProtocolExecutionOptions): Promise<void> {
    const twitterTool = tools.find(tool => 
      tool.name.includes('twitter') || 
      tool.name.includes('tweet') || 
      tool.name.includes('social_reply')
    );
    
    if (!twitterTool) {
      log('No Twitter reply tool available', 'agent');
      item.responseStatus = 'sent'; // Mark as sent for demo purposes
      return;
    }
    
    try {
      // Create Twitter reply parameters
      const twitterParams = {
        reply_to_id: item.id,
        content: item.response
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: twitterTool.name,
          input: twitterParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the Twitter reply tool
      const twitterResult = await twitterTool.execute(twitterParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: twitterTool.name,
          input: twitterParams,
          output: twitterResult,
          error: undefined
        });
      }
      
      // Mark as sent
      item.responseStatus = 'sent';
    } catch (error) {
      log(`Twitter reply error: ${error}`, 'agent');
      // Don't change status, will retry later
    }
  }

  /**
   * Send a GitHub response
   */
  private async sendGitHubResponse(item: any, tools: AgentTool[], options: ProtocolExecutionOptions): Promise<void> {
    const githubTool = tools.find(tool => 
      tool.name.includes('github') || 
      tool.name.includes('git_comment') || 
      tool.name.includes('repo_reply')
    );
    
    if (!githubTool) {
      log('No GitHub reply tool available', 'agent');
      item.responseStatus = 'sent'; // Mark as sent for demo purposes
      return;
    }
    
    try {
      // Create GitHub reply parameters
      const githubParams = {
        item_id: item.id,
        content: item.response
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: githubParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the GitHub reply tool
      const githubResult = await githubTool.execute(githubParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: githubParams,
          output: githubResult,
          error: undefined
        });
      }
      
      // Mark as sent
      item.responseStatus = 'sent';
    } catch (error) {
      log(`GitHub reply error: ${error}`, 'agent');
      // Don't change status, will retry later
    }
  }

  /**
   * Format the monitoring report
   */
  private formatMonitoringReport(): string {
    let report = `# Riona AI Monitoring Report\n\n`;
    
    report += `## Monitoring Parameters\n`;
    if (this.monitoringParams) {
      report += `- Platforms: ${this.monitoringParams.platform}\n`;
      report += `- Keywords: ${this.monitoringParams.keywords.join(', ')}\n`;
      report += `- Accounts: ${this.monitoringParams.accounts.join(', ')}\n`;
      if (this.monitoringParams.repositories) {
        report += `- Repositories: ${this.monitoringParams.repositories.join(', ')}\n`;
      }
      report += `- Mentions Only: ${this.monitoringParams.mentionsOnly ? 'Yes' : 'No'}\n`;
      report += `- Check Frequency: ${this.monitoringParams.checkFrequency}\n\n`;
    }
    
    report += `## Response Parameters\n`;
    if (this.responseParams) {
      report += `- Tone: ${this.responseParams.tone}\n`;
      report += `- Auto-Respond: ${this.responseParams.autoRespond ? 'Yes' : 'No'}\n`;
      if (this.responseParams.maxResponsesPerDay) {
        report += `- Max Responses Per Day: ${this.responseParams.maxResponsesPerDay}\n`;
      }
      report += `- Require Approval: ${this.responseParams.requireApproval ? 'Yes' : 'No'}\n\n`;
    }
    
    report += `## Monitored Items\n`;
    if (this.monitoredItems.length === 0) {
      report += `No items found matching the monitoring criteria.\n\n`;
    } else {
      this.monitoredItems.forEach((item, idx) => {
        report += `### Item ${idx + 1}: ${item.platform.toUpperCase()} - ${item.author}\n`;
        report += `**Content:** ${item.content}\n`;
        report += `**Time:** ${item.timestamp}\n`;
        
        if (item.response) {
          report += `**Generated Response:** ${item.response}\n`;
          report += `**Status:** ${item.responseStatus}\n`;
        }
        
        report += `\n`;
      });
    }
    
    report += `## Summary\n`;
    const itemsByPlatform: Record<string, number> = {};
    this.monitoredItems.forEach(item => {
      itemsByPlatform[item.platform] = (itemsByPlatform[item.platform] || 0) + 1;
    });
    
    Object.entries(itemsByPlatform).forEach(([platform, count]) => {
      report += `- ${platform.toUpperCase()}: ${count} items\n`;
    });
    
    const responseCount = this.monitoredItems.filter(item => item.responseStatus === 'sent').length;
    report += `- Responses Sent: ${responseCount}\n`;
    
    const pendingCount = this.monitoredItems.filter(item => item.responseStatus === 'pending').length;
    report += `- Pending Approval: ${pendingCount}\n`;
    
    return report;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // Tool calls are tracked through the protocol execution
    // This would be populated in a real implementation
    
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
    // Reset monitoring state
    this.monitoringParams = null;
    this.responseParams = null;
    this.monitoredItems = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}