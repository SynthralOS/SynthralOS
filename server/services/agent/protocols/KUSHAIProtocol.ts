/**
 * KUSH AI Protocol Implementation
 * 
 * Implements the KUSH AI protocol for blog writing and content marketing.
 * Specialized in generating high-quality content tailored for specific audiences.
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

// Content formats
enum ContentFormat {
  BLOG_POST = 'blog_post',
  SOCIAL_MEDIA = 'social_media',
  EMAIL_CAMPAIGN = 'email_campaign',
  PRODUCT_DESCRIPTION = 'product_description',
  LANDING_PAGE = 'landing_page',
  NEWSLETTER = 'newsletter'
}

// Content strategy
interface ContentStrategy {
  targetAudience: string;
  brandVoice: string;
  keyMessages: string[];
  keywords: string[];
  cta: string;
  format: ContentFormat;
  length: 'short' | 'medium' | 'long';
}

// Content outline
interface ContentOutline {
  title: string;
  hook: string;
  sections: {
    heading: string;
    keyPoints: string[];
  }[];
  conclusion: string;
}

export class KUSHAIProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are KUSH AI, an expert content marketing agent specializing in creating high-quality, SEO-optimized content for blogs, social media, and marketing campaigns. 
    
You excel at:
1. Analyzing target audiences to create personalized content
2. Crafting compelling headlines and hooks
3. Creating content strategies aligned with business goals
4. Optimizing content for search engines
5. Maintaining consistent brand voice
6. Creating conversion-focused calls to action`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.7,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.SINGLE_SHOT,
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.ROLE_PLAYING
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Content strategy properties
  private contentStrategy: ContentStrategy | null = null;
  private contentOutline: ContentOutline | null = null;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'KUSH AI',
      version: '1.0.0',
      description: 'Blog writer & content marketer agent',
      capabilities: [
        ProtocolCapabilities.SINGLE_SHOT,
        ProtocolCapabilities.TOOL_USE,
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
    
    // Reset content strategy
    this.contentStrategy = null;
    this.contentOutline = null;
    
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
          name: 'Content Strategy',
          description: 'Developing content strategy',
          status: 'started'
        });
      }

      // Step 1: Develop content strategy
      this.contentStrategy = await this.createContentStrategy(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Content Strategy',
          description: 'Content strategy developed',
          output: this.contentStrategy,
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Content Outline',
          description: 'Creating content outline',
          status: 'started'
        });
      }

      // Step 2: Create content outline
      this.contentOutline = await this.createContentOutline(this.contentStrategy, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Content Outline',
          description: 'Content outline created',
          output: this.contentOutline,
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Content Creation',
          description: 'Writing content based on outline',
          status: 'started'
        });
      }

      // Step 3: Generate the content
      const content = await this.generateContent(this.contentStrategy, this.contentOutline, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Content Creation',
          description: 'Content created successfully',
          status: 'completed'
        });
      }
      
      // Step 4: Use tools if needed (e.g., SEO analysis, image suggestions)
      const toolResults = await this.useContentTools(content, options);
      
      // Prepare the final response
      const agentResponse: AgentResponse = {
        response: {
          content: content,
          toolCalls: toolResults
        },
        executionTime: Date.now() - startTime,
        protocol: 'kushai',
        metadata: {
          contentStrategy: this.contentStrategy,
          contentOutline: this.contentOutline
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`KUSH AI Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Create content strategy from task description
   */
  private async createContentStrategy(task: string, options: ProtocolExecutionOptions): Promise<ContentStrategy> {
    // Generate the strategy prompt
    const strategyPrompt = `As KUSH AI, analyze the following content request and develop a comprehensive content strategy:

Content Request: ${task}

Create a content strategy that includes:
1. Target audience (demographics, interests, pain points)
2. Brand voice and tone
3. Key messages to communicate
4. Primary and secondary keywords for SEO
5. Call to action
6. Recommended content format
7. Ideal content length

Respond with a JSON object in this format:
{
  "targetAudience": "detailed description of target audience",
  "brandVoice": "description of brand voice and tone",
  "keyMessages": ["message 1", "message 2", "message 3"],
  "keywords": ["primary keyword", "secondary keyword 1", "secondary keyword 2"],
  "cta": "specific call to action",
  "format": "one of: blog_post, social_media, email_campaign, product_description, landing_page, newsletter",
  "length": "short, medium, or long"
}`;

    // Get response from the LLM
    const strategyResponse = await this.getResponseFromLLM(strategyPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = strategyResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const strategy = JSON.parse(jsonMatch[0]);
        
        // Validate the strategy object
        if (!strategy.targetAudience || !strategy.brandVoice || 
            !Array.isArray(strategy.keyMessages) || !Array.isArray(strategy.keywords) ||
            !strategy.cta || !strategy.format || !strategy.length) {
          throw new Error('Invalid content strategy format');
        }
        
        return strategy as ContentStrategy;
      }
      
      throw new Error('Could not parse content strategy JSON');
    } catch (error) {
      log(`Error creating content strategy: ${error}`, 'agent');
      
      // Return a default strategy
      return {
        targetAudience: 'General audience interested in the topic',
        brandVoice: 'Professional, informative, and friendly',
        keyMessages: ['Provide valuable information on the topic', 'Establish expertise in the field'],
        keywords: [task.split(' ').slice(0, 2).join(' ')],
        cta: 'Learn more about the topic',
        format: ContentFormat.BLOG_POST,
        length: 'medium'
      };
    }
  }

  /**
   * Create content outline based on strategy
   */
  private async createContentOutline(strategy: ContentStrategy, options: ProtocolExecutionOptions): Promise<ContentOutline> {
    // Generate the outline prompt
    const outlinePrompt = `As KUSH AI, create a detailed content outline based on the following content strategy:

Content Strategy:
- Target Audience: ${strategy.targetAudience}
- Brand Voice: ${strategy.brandVoice}
- Key Messages: ${strategy.keyMessages.join(', ')}
- Keywords: ${strategy.keywords.join(', ')}
- Call to Action: ${strategy.cta}
- Format: ${strategy.format}
- Length: ${strategy.length}

Create a comprehensive outline that includes:
1. An attention-grabbing title incorporating primary keywords
2. A compelling hook/introduction
3. Main content sections with headings and key points
4. A conclusion that reinforces key messages and includes the call to action

Respond with a JSON object in this format:
{
  "title": "Attention-grabbing title",
  "hook": "Compelling introduction paragraph",
  "sections": [
    {
      "heading": "Section heading 1",
      "keyPoints": ["key point 1", "key point 2", "key point 3"]
    },
    {
      "heading": "Section heading 2",
      "keyPoints": ["key point 1", "key point 2", "key point 3"]
    }
  ],
  "conclusion": "Conclusion paragraph with call to action"
}`;

    // Get response from the LLM
    const outlineResponse = await this.getResponseFromLLM(outlinePrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = outlineResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const outline = JSON.parse(jsonMatch[0]);
        
        // Validate the outline object
        if (!outline.title || !outline.hook || 
            !Array.isArray(outline.sections) || !outline.conclusion) {
          throw new Error('Invalid content outline format');
        }
        
        // Validate each section
        for (const section of outline.sections) {
          if (!section.heading || !Array.isArray(section.keyPoints)) {
            throw new Error('Invalid section format in content outline');
          }
        }
        
        return outline as ContentOutline;
      }
      
      throw new Error('Could not parse content outline JSON');
    } catch (error) {
      log(`Error creating content outline: ${error}`, 'agent');
      
      // Return a default outline
      return {
        title: `Guide to ${strategy.keywords[0] || 'the topic'}`,
        hook: 'An engaging introduction to the topic.',
        sections: [
          {
            heading: 'Introduction to the Topic',
            keyPoints: ['What the topic is about', 'Why it matters', 'Who should care']
          },
          {
            heading: 'Key Aspects to Consider',
            keyPoints: ['First important aspect', 'Second important aspect', 'Third important aspect']
          },
          {
            heading: 'Best Practices',
            keyPoints: ['Best practice 1', 'Best practice 2', 'Best practice 3']
          }
        ],
        conclusion: `Recap of the key points covered and a reminder to ${strategy.cta}.`
      };
    }
  }

  /**
   * Generate content based on strategy and outline
   */
  private async generateContent(strategy: ContentStrategy, outline: ContentOutline, options: ProtocolExecutionOptions): Promise<string> {
    // Generate the content prompt
    const contentPrompt = `As KUSH AI, generate complete ${strategy.format} content based on the following strategy and outline:

Content Strategy:
- Target Audience: ${strategy.targetAudience}
- Brand Voice: ${strategy.brandVoice}
- Key Messages: ${strategy.keyMessages.join(', ')}
- Keywords: ${strategy.keywords.join(', ')}
- Call to Action: ${strategy.cta}
- Format: ${strategy.format}
- Length: ${strategy.length}

Content Outline:
- Title: ${outline.title}
- Hook: ${outline.hook}
- Sections:
${outline.sections.map(section => `  - ${section.heading}
${section.keyPoints.map(point => `    * ${point}`).join('\n')}`).join('\n')}
- Conclusion: ${outline.conclusion}

Guidelines for content creation:
1. Naturally incorporate primary and secondary keywords throughout the content
2. Maintain the specified brand voice and tone
3. Address the target audience's needs and pain points
4. Include statistics, examples, or case studies where appropriate
5. Ensure all key messages are effectively communicated
6. End with the specified call to action
7. Format the content appropriately for ${strategy.format}
8. Ensure the length is appropriate (${strategy.length})

Generate the complete content now:`;

    // Get response from the LLM
    return await this.getResponseFromLLM(contentPrompt);
  }

  /**
   * Use content tools (e.g., SEO analysis, image suggestions)
   */
  private async useContentTools(content: string, options: ProtocolExecutionOptions): Promise<Array<{name: string, input: Record<string, any>, output: any}> | undefined> {
    const tools = options.tools || this.availableTools;
    if (tools.length === 0) {
      return undefined;
    }
    
    const toolResults: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    // Look for SEO analysis tool
    const seoTool = tools.find(tool => tool.name.includes('seo') || tool.name.includes('keyword'));
    if (seoTool && this.contentStrategy) {
      try {
        // Create input parameters for SEO analysis
        const seoParams = {
          content: content,
          keywords: this.contentStrategy.keywords,
          title: this.contentOutline?.title || '',
          url: options.context?.url || ''
        };
        
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: seoTool.name,
            input: seoParams,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the SEO tool
        const seoResult = await seoTool.execute(seoParams);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: seoTool.name,
            input: seoParams,
            output: seoResult,
            error: undefined
          });
        }
        
        toolResults.push({
          name: seoTool.name,
          input: seoParams,
          output: seoResult
        });
      } catch (error) {
        log(`SEO tool execution error: ${error}`, 'agent');
      }
    }
    
    // Look for image suggestion tool
    const imageTool = tools.find(tool => tool.name.includes('image') || tool.name.includes('media'));
    if (imageTool && this.contentStrategy) {
      try {
        // Create input parameters for image suggestions
        const imageParams = {
          topic: this.contentOutline?.title || '',
          keywords: this.contentStrategy.keywords,
          style: this.contentStrategy.brandVoice,
          count: 3
        };
        
        // Call onToolUse callback if provided
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: imageTool.name,
            input: imageParams,
            output: undefined,
            error: undefined
          });
        }
        
        // Execute the image tool
        const imageResult = await imageTool.execute(imageParams);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName: imageTool.name,
            input: imageParams,
            output: imageResult,
            error: undefined
          });
        }
        
        toolResults.push({
          name: imageTool.name,
          input: imageParams,
          output: imageResult
        });
      } catch (error) {
        log(`Image tool execution error: ${error}`, 'agent');
      }
    }
    
    return toolResults.length > 0 ? toolResults : undefined;
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
    // Reset content strategy state
    this.contentStrategy = null;
    this.contentOutline = null;
    this.initialized = false;
    
    return Promise.resolve();
  }
}