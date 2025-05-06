/**
 * Instagram AI Agent Protocol Implementation
 * 
 * Implements the Instagram AI Agent protocol for Instagram posting automation.
 * Focuses on creating, scheduling, and optimizing Instagram content.
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

// Instagram content types
enum InstagramContentType {
  POST = 'post',
  STORY = 'story',
  REEL = 'reel',
  CAROUSEL = 'carousel'
}

// Instagram content
interface InstagramContent {
  type: InstagramContentType;
  caption: string;
  hashtags: string[];
  mediaDescriptions: string[];
  postTime?: string;
  targetAudience: string;
}

export class InstagramAgentProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are an Instagram AI Agent, specialized in creating, optimizing, and scheduling Instagram content. 
    
You excel at:
1. Crafting engaging Instagram captions that drive engagement
2. Selecting optimal hashtags for maximum reach
3. Creating visual content descriptions for posts, stories, reels, and carousels
4. Analyzing audience demographics and preferences
5. Planning optimal posting schedules based on engagement data
6. Creating Instagram content strategies aligned with business goals`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 1024,
    capabilities: [
      ProtocolCapabilities.SINGLE_SHOT,
      ProtocolCapabilities.TOOL_USE
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private instagramContent: InstagramContent | null = null;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Instagram AI Agent',
      version: '1.0.0',
      description: 'Instagram media posting automation',
      capabilities: [
        ProtocolCapabilities.SINGLE_SHOT,
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
    
    // Reset Instagram content
    this.instagramContent = null;
    
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
          name: 'Instagram Content Analysis',
          description: 'Analyzing request and determining optimal content type',
          status: 'started'
        });
      }

      // Step 1: Analyze the task and determine content type
      const contentType = await this.determineContentType(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Instagram Content Analysis',
          description: `Determined optimal content type: ${contentType}`,
          output: { contentType },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Caption & Hashtag Generation',
          description: 'Creating engaging caption and relevant hashtags',
          status: 'started'
        });
      }

      // Step 2: Generate content (caption, hashtags)
      const content = await this.generateContent(options.task, contentType, options);
      this.instagramContent = content;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Caption & Hashtag Generation',
          description: 'Created engaging caption and hashtags',
          output: {
            caption: content.caption,
            hashtags: content.hashtags
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Media Description',
          description: 'Creating visual media descriptions',
          status: 'started'
        });
      }

      // Step 3: Generate media descriptions
      const mediaDescriptions = await this.generateMediaDescriptions(content, options);
      content.mediaDescriptions = mediaDescriptions;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Media Description',
          description: 'Created visual media descriptions',
          output: { mediaDescriptions },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Posting Schedule',
          description: 'Determining optimal posting schedule',
          status: 'started'
        });
      }

      // Step 4: Generate posting schedule
      const postingTime = await this.determinePostingSchedule(content, options);
      content.postTime = postingTime;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Posting Schedule',
          description: 'Determined optimal posting time',
          output: { postingTime },
          status: 'completed'
        });
      }

      // Step 5: Use tools if available (e.g., scheduling tool, Instagram API)
      const toolResults = await this.useInstagramTools(content, options);
      
      // Prepare the final response
      const finalResponse = this.formatInstagramContentResponse(content);
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: toolResults
        },
        executionTime: Date.now() - startTime,
        protocol: 'instagram',
        metadata: {
          contentType: content.type,
          hashtags: content.hashtags,
          scheduledTime: content.postTime
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Instagram Agent Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Determine the appropriate Instagram content type
   */
  private async determineContentType(task: string, options: ProtocolExecutionOptions): Promise<InstagramContentType> {
    // Check if the content type is explicitly mentioned in the task
    if (/reels?|video|videos/i.test(task)) {
      return InstagramContentType.REEL;
    } else if (/stor(y|ies)/i.test(task)) {
      return InstagramContentType.STORY;
    } else if (/carousel|multiple|slides?|images?/i.test(task)) {
      return InstagramContentType.CAROUSEL;
    } else if (/post|feed/i.test(task)) {
      return InstagramContentType.POST;
    }
    
    // If not explicitly mentioned, ask the LLM to determine the best content type
    const contentTypePrompt = `As an Instagram AI Agent, analyze the following content request and determine the BEST Instagram content type:

Content Request: ${task}

Based on this request, which Instagram content type would be most effective?
- POST (single image in the feed)
- STORY (ephemeral 24-hour content)
- REEL (short-form video content)
- CAROUSEL (multiple images in one post)

Consider factors like:
- The type of content being described
- The goal of the content (awareness, engagement, etc.)
- Visual storytelling capabilities
- Typical audience engagement patterns

Respond with the best content type as a single word: POST, STORY, REEL, or CAROUSEL.`;

    const contentTypeResponse = await this.getResponseFromLLM(contentTypePrompt);
    
    // Parse the response
    if (/carousel/i.test(contentTypeResponse)) {
      return InstagramContentType.CAROUSEL;
    } else if (/reel/i.test(contentTypeResponse)) {
      return InstagramContentType.REEL;
    } else if (/story/i.test(contentTypeResponse)) {
      return InstagramContentType.STORY;
    } else {
      return InstagramContentType.POST; // Default to POST
    }
  }

  /**
   * Generate Instagram content (caption, hashtags)
   */
  private async generateContent(task: string, contentType: InstagramContentType, options: ProtocolExecutionOptions): Promise<InstagramContent> {
    // Generate the content prompt
    const contentPrompt = `As an Instagram AI Agent, create engaging caption and hashtags for the following Instagram ${contentType}:

Content Request: ${task}

Create:
1. An engaging, persuasive caption (aim for 1-3 sentences for optimal engagement)
2. A set of relevant hashtags (5-10 hashtags, mix of popular and niche)
3. Target audience description

Respond with a JSON object in this format:
{
  "caption": "Your engaging Instagram caption here",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3"],
  "targetAudience": "Description of the target audience"
}`;

    // Get response from the LLM
    const contentResponse = await this.getResponseFromLLM(contentPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = contentResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const parsedContent = JSON.parse(jsonMatch[0]);
        
        // Validate the content object
        if (!parsedContent.caption || !Array.isArray(parsedContent.hashtags) || !parsedContent.targetAudience) {
          throw new Error('Invalid content format');
        }
        
        return {
          type: contentType,
          caption: parsedContent.caption,
          hashtags: parsedContent.hashtags,
          mediaDescriptions: [],
          targetAudience: parsedContent.targetAudience
        };
      }
      
      throw new Error('Could not parse content JSON');
    } catch (error) {
      log(`Error generating Instagram content: ${error}`, 'agent');
      
      // Extract caption and hashtags using regex
      const captionMatch = /caption["']?\s*:[\s\S]*?["']([\s\S]*?)["']/i.exec(contentResponse);
      const hashtagMatch = contentResponse.match(/#[a-zA-Z0-9]+/g);
      
      // Return a default content object
      return {
        type: contentType,
        caption: captionMatch ? captionMatch[1] : `Check out this amazing ${contentType}!`,
        hashtags: hashtagMatch ? hashtagMatch.map(h => h.substring(1)) : ['instagram', 'social', 'content'],
        mediaDescriptions: [],
        targetAudience: 'Instagram users interested in this content'
      };
    }
  }

  /**
   * Generate media descriptions for the Instagram content
   */
  private async generateMediaDescriptions(content: InstagramContent, options: ProtocolExecutionOptions): Promise<string[]> {
    // Determine number of media items needed
    let mediaCount = 1;
    if (content.type === InstagramContentType.CAROUSEL) {
      mediaCount = 3; // Default to 3 slides for carousel
    }
    
    // Generate the media description prompt
    const mediaPrompt = `As an Instagram AI Agent, create detailed visual descriptions for an Instagram ${content.type} with the following caption:

Caption: ${content.caption}
Target Audience: ${content.targetAudience}

Create ${mediaCount} detailed visual description${mediaCount > 1 ? 's' : ''} for the media that would accompany this Instagram ${content.type}. 
${content.type === InstagramContentType.CAROUSEL ? 'Each carousel slide should build upon the previous one to tell a cohesive visual story.' : ''}
${content.type === InstagramContentType.REEL ? 'Describe a short video sequence with key visual elements and transitions.' : ''}

Each description should include:
1. Main visual elements and composition
2. Color scheme and mood
3. Text overlay (if any)
4. Props or setting

Respond with a JSON array of descriptions:
[
  "Detailed description of image/video 1",
  ${mediaCount > 1 ? '"Detailed description of image/video 2",' : ''}
  ${mediaCount > 2 ? '"Detailed description of image/video 3"' : ''}
]`;

    // Get response from the LLM
    const mediaResponse = await this.getResponseFromLLM(mediaPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = mediaResponse.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsedMedia = JSON.parse(jsonMatch[0]);
        
        // Validate the media array
        if (!Array.isArray(parsedMedia)) {
          throw new Error('Invalid media descriptions format');
        }
        
        return parsedMedia;
      }
      
      throw new Error('Could not parse media descriptions JSON');
    } catch (error) {
      log(`Error generating media descriptions: ${error}`, 'agent');
      
      // Create default media descriptions
      const defaultDescriptions = [];
      for (let i = 0; i < mediaCount; i++) {
        defaultDescriptions.push(`Visual ${i + 1}: Engaging image related to the caption, with appealing composition and on-brand colors.`);
      }
      
      return defaultDescriptions;
    }
  }

  /**
   * Determine optimal posting schedule
   */
  private async determinePostingSchedule(content: InstagramContent, options: ProtocolExecutionOptions): Promise<string> {
    // Check if posting time is specified in the task
    const task = options.task;
    const timeRegex = /post(?:ed)?\s+(?:at|on)\s+([a-zA-Z0-9\s,:]+)/i;
    const timeMatch = timeRegex.exec(task);
    
    if (timeMatch) {
      return timeMatch[1];
    }
    
    // Generate the scheduling prompt
    const schedulePrompt = `As an Instagram AI Agent, determine the optimal posting time for an Instagram ${content.type} targeted at the following audience:

Target Audience: ${content.targetAudience}

Consider:
1. Typical online behavior of this audience
2. Time zone considerations (default to Eastern Time if not specified)
3. Day of the week that would get maximum engagement
4. Optimal time of day for this content type

Respond with a single specific date and time for posting (e.g., "Monday, May 5th at 6:30 PM ET").`;

    // Get response from the LLM
    const scheduleResponse = await this.getResponseFromLLM(schedulePrompt);
    
    // Clean up the response
    const cleanedResponse = scheduleResponse.trim().replace(/^\"|\"$/g, '');
    
    // If the response contains a specific day and time, return it
    if (/^[A-Za-z]+day|[0-9]{1,2}:[0-9]{2}|AM|PM/i.test(cleanedResponse)) {
      return cleanedResponse;
    }
    
    // Default to a general recommendation
    return 'Next Monday at 6:00 PM ET';
  }

  /**
   * Use Instagram tools if available
   */
  private async useInstagramTools(content: InstagramContent, options: ProtocolExecutionOptions): Promise<Array<{name: string, input: Record<string, any>, output: any}> | undefined> {
    const tools = options.tools || this.availableTools;
    if (tools.length === 0) {
      return undefined;
    }
    
    const toolResults: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    // Look for Instagram API tool
    const instagramTool = tools.find(tool => 
      tool.name.includes('instagram') || 
      tool.name.includes('social') || 
      tool.name.includes('post')
    );
    
    if (instagramTool) {
      try {
        // Create input parameters for Instagram posting
        const instagramParams = {
          contentType: content.type,
          caption: `${content.caption}\n\n${content.hashtags.map(h => `#${h}`).join(' ')}`,
          mediaDescriptions: content.mediaDescriptions,
          scheduledTime: content.postTime
        };
        
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: instagramTool.name,
            input: instagramParams,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the Instagram tool
        const instagramResult = await instagramTool.execute(instagramParams);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: instagramTool.name,
            input: instagramParams,
            output: instagramResult,
            error: undefined
          });
        }
        
        toolResults.push({
          name: instagramTool.name,
          input: instagramParams,
          output: instagramResult
        });
      } catch (error) {
        log(`Instagram tool execution error: ${error}`, 'agent');
      }
    }
    
    return toolResults.length > 0 ? toolResults : undefined;
  }

  /**
   * Format the Instagram content response
   */
  private formatInstagramContentResponse(content: InstagramContent): string {
    let response = `# Instagram ${content.type.charAt(0).toUpperCase() + content.type.slice(1)} Content\n\n`;
    
    response += `## Caption\n${content.caption}\n\n`;
    
    response += `## Hashtags\n${content.hashtags.map(h => `#${h}`).join(' ')}\n\n`;
    
    response += `## Media Description${content.mediaDescriptions.length > 1 ? 's' : ''}\n`;
    content.mediaDescriptions.forEach((desc, idx) => {
      response += `### Media ${idx + 1}\n${desc}\n\n`;
    });
    
    response += `## Target Audience\n${content.targetAudience}\n\n`;
    
    if (content.postTime) {
      response += `## Recommended Posting Time\n${content.postTime}\n\n`;
    }
    
    response += `## Best Practices\n`;
    response += `1. Review the caption for tone and alignment with brand voice\n`;
    response += `2. Ensure the visual content matches the description provided\n`;
    response += `3. Consider adding location tags for increased visibility\n`;
    response += `4. Respond to comments within 1 hour of posting for maximum engagement\n`;
    
    return response;
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
    // Reset internal state
    this.instagramContent = null;
    this.initialized = false;
    
    return Promise.resolve();
  }
}