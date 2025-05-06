/**
 * Microsoft Agent AutoBuilder Protocol Implementation
 * 
 * Implements Microsoft's Agent AutoBuilder for dynamic agent assembly.
 * Focuses on automatic agent creation based on task requirements.
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

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Agent configuration models
interface AgentSkill {
  id: string;
  name: string;
  description: string;
  promptAddition: string;
  requiredTools: string[];
}

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  basePrompt: string;
  defaultTools: string[];
  skillCompatibility: string[];
}

interface BuiltAgent {
  name: string;
  description: string;
  skills: AgentSkill[];
  fullPrompt: string;
  toolNames: string[];
}

interface ExecutionResult {
  response: string;
  toolCalls?: Array<{
    tool: string;
    input: Record<string, any>;
    output: any;
  }>;
  followupQuestions?: string[];
  thinking?: string;
}

export class MSAgentAutoBuilderProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Microsoft Agent AutoBuilder, specialized in dynamically creating AI agents tailored to specific tasks.
You excel at:
1. Analyzing task requirements and determining needed capabilities
2. Assembling custom agents with appropriate skills
3. Optimizing agent configurations for specific contexts
4. Generating effective prompts for specialized agents
5. Managing tool selection for maximum agent utility`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.3,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.SELF_IMPROVEMENT,
      ProtocolCapabilities.MULTI_STEP
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Agent building state
  private agentTemplates: AgentTemplate[] = [];
  private availableSkills: AgentSkill[] = [];
  private builtAgent: BuiltAgent | null = null;
  private taskAnalysis: string = '';
  private executionResult: ExecutionResult | null = null;

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Microsoft Agent AutoBuilder',
      version: '1.0.0',
      description: 'Dynamic agent assembly based on task requirements',
      capabilities: [
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.SELF_IMPROVEMENT,
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
    
    // Initialize agent templates and skills
    this.initializeAgentTemplates();
    this.initializeAgentSkills();
    
    // Reset state
    this.builtAgent = null;
    this.taskAnalysis = '';
    this.executionResult = null;
    
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
          description: 'Analyzing task requirements',
          status: 'started'
        });
      }

      // Step 1: Analyze the task
      await this.analyzeTask(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Analysis',
          description: 'Task requirements analyzed',
          output: { analysis: this.taskAnalysis },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Building',
          description: 'Constructing specialized agent',
          status: 'started'
        });
      }

      // Step 2: Build a specialized agent
      await this.buildSpecializedAgent(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Agent Building',
          description: 'Specialized agent built',
          output: { 
            agentName: this.builtAgent?.name,
            skills: this.builtAgent?.skills.map(s => s.name)
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Execution',
          description: 'Executing task with specialized agent',
          status: 'started'
        });
      }

      // Step 3: Execute the task with the specialized agent
      await this.executeWithSpecializedAgent(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Task Execution',
          description: 'Task execution completed',
          output: { 
            response: this.executionResult?.response?.substring(0, 100) + '...',
            toolCallCount: this.executionResult?.toolCalls?.length || 0
          },
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.formatFinalResponse();
      
      const toolCalls = this.executionResult?.toolCalls?.map(tc => ({
        name: tc.tool, 
        input: tc.input, 
        output: tc.output
      }));
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: toolCalls?.length ? toolCalls : undefined
        },
        executionTime: Date.now() - startTime,
        protocol: 'msagentautobuilder',
        metadata: {
          agentName: this.builtAgent?.name,
          skills: this.builtAgent?.skills.map(s => s.name),
          taskAnalysis: this.taskAnalysis
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Microsoft Agent AutoBuilder Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Initialize agent templates
   */
  private initializeAgentTemplates(): void {
    this.agentTemplates = [
      {
        id: 'general',
        name: 'General Assistant',
        description: 'Versatile assistant for general tasks',
        basePrompt: `You are a versatile AI assistant focused on helping users with a wide variety of tasks. 
Your goal is to be helpful, harmless, and honest in all your interactions.`,
        defaultTools: ['web_search', 'calculator'],
        skillCompatibility: ['writing', 'research', 'planning', 'analysis']
      },
      {
        id: 'developer',
        name: 'Developer Assistant',
        description: 'Specialized in software development tasks',
        basePrompt: `You are a software development assistant with expertise in programming, software architecture, and technical problem-solving.
Your goal is to help users write, debug, and improve code across various programming languages and frameworks.`,
        defaultTools: ['code_execution', 'web_search', 'file_manager'],
        skillCompatibility: ['coding', 'debugging', 'architecture', 'database', 'testing']
      },
      {
        id: 'researcher',
        name: 'Research Assistant',
        description: 'Specialized in information gathering and analysis',
        basePrompt: `You are a research assistant with expertise in finding, analyzing, and summarizing information.
Your goal is to help users conduct thorough research, synthesize data, and draw evidence-based conclusions.`,
        defaultTools: ['web_search', 'document_analyzer', 'citation_generator'],
        skillCompatibility: ['research', 'analysis', 'summarization', 'academic', 'critical_thinking']
      },
      {
        id: 'content_creator',
        name: 'Content Creation Assistant',
        description: 'Specialized in creating various types of content',
        basePrompt: `You are a content creation assistant with expertise in writing, editing, and formatting various types of content.
Your goal is to help users create engaging, well-structured, and polished content for different purposes and audiences.`,
        defaultTools: ['document_editor', 'image_search'],
        skillCompatibility: ['writing', 'editing', 'storytelling', 'seo', 'marketing']
      },
      {
        id: 'data_analyst',
        name: 'Data Analysis Assistant',
        description: 'Specialized in data processing and analysis',
        basePrompt: `You are a data analysis assistant with expertise in processing, analyzing, and visualizing data.
Your goal is to help users extract insights from data, perform statistical analyses, and communicate findings clearly.`,
        defaultTools: ['calculator', 'data_processor', 'chart_generator'],
        skillCompatibility: ['statistics', 'visualization', 'analysis', 'database', 'modeling']
      }
    ];
  }

  /**
   * Initialize agent skills
   */
  private initializeAgentSkills(): void {
    this.availableSkills = [
      // Coding skills
      {
        id: 'coding',
        name: 'Code Generation',
        description: 'Ability to write clean, efficient code in various programming languages',
        promptAddition: `You excel at writing clean, efficient, and well-documented code in various programming languages. 
You understand programming best practices, algorithms, and data structures.`,
        requiredTools: ['code_execution']
      },
      {
        id: 'debugging',
        name: 'Debugging',
        description: 'Ability to identify and fix issues in code',
        promptAddition: `You excel at debugging code by identifying issues, understanding error messages, and proposing fixes. 
You can methodically trace through code execution to pinpoint problems.`,
        requiredTools: ['code_execution']
      },
      
      // Research skills
      {
        id: 'research',
        name: 'Research',
        description: 'Ability to find and synthesize information from various sources',
        promptAddition: `You excel at conducting comprehensive research by finding, evaluating, and synthesizing information from multiple sources. 
You can formulate research questions and search strategies to efficiently gather relevant information.`,
        requiredTools: ['web_search']
      },
      {
        id: 'academic',
        name: 'Academic Writing',
        description: 'Ability to write in formal academic style with proper citations',
        promptAddition: `You excel at academic writing with a focus on clarity, precision, and proper citation of sources. 
You understand academic conventions and can write in a scholarly tone.`,
        requiredTools: ['citation_generator']
      },
      
      // Writing skills
      {
        id: 'writing',
        name: 'Creative Writing',
        description: 'Ability to create engaging and original written content',
        promptAddition: `You excel at creative writing with a focus on originality, engaging narrative, and vivid description. 
You can adjust your writing style to different genres and audiences.`,
        requiredTools: ['document_editor']
      },
      {
        id: 'editing',
        name: 'Editing and Proofreading',
        description: 'Ability to improve and correct written content',
        promptAddition: `You excel at editing and proofreading with a focus on grammar, clarity, and consistency. 
You can identify and fix writing issues while preserving the author's voice and intent.`,
        requiredTools: ['document_editor']
      },
      
      // Analysis skills
      {
        id: 'analysis',
        name: 'Critical Analysis',
        description: 'Ability to evaluate information and arguments critically',
        promptAddition: `You excel at critical analysis with a focus on evaluating arguments, identifying assumptions, and recognizing biases. 
You can break down complex ideas and assess their validity and implications.`,
        requiredTools: []
      },
      {
        id: 'statistics',
        name: 'Statistical Analysis',
        description: 'Ability to perform and interpret statistical analyses',
        promptAddition: `You excel at statistical analysis with a focus on selecting appropriate methods, interpreting results, and drawing valid conclusions. 
You understand statistical concepts and can explain them in accessible terms.`,
        requiredTools: ['calculator', 'data_processor']
      },
      
      // Planning skills
      {
        id: 'planning',
        name: 'Strategic Planning',
        description: 'Ability to create structured plans with clear steps',
        promptAddition: `You excel at strategic planning with a focus on goal setting, resource allocation, and action sequencing. 
You can break down complex objectives into manageable steps and anticipate potential challenges.`,
        requiredTools: []
      },
      {
        id: 'project_management',
        name: 'Project Management',
        description: 'Ability to organize and track project components and timelines',
        promptAddition: `You excel at project management with a focus on task organization, timeline creation, and progress tracking. 
You can help users define project scope, identify dependencies, and manage resources effectively.`,
        requiredTools: []
      },
      
      // Technical skills
      {
        id: 'database',
        name: 'Database Management',
        description: 'Ability to design and query databases',
        promptAddition: `You excel at database management with a focus on schema design, query optimization, and data integrity. 
You understand database concepts and can work with various database systems.`,
        requiredTools: ['code_execution']
      },
      {
        id: 'architecture',
        name: 'Software Architecture',
        description: 'Ability to design software systems and components',
        promptAddition: `You excel at software architecture with a focus on system design, component interaction, and design patterns. 
You can create architectures that balance functionality, performance, security, and maintainability.`,
        requiredTools: []
      }
    ];
  }

  /**
   * Analyze the task to determine required capabilities
   */
  private async analyzeTask(task: string, options: ProtocolExecutionOptions): Promise<void> {
    const analysisPrompt = `As Microsoft Agent AutoBuilder, analyze this task to determine the type of agent and skills needed to complete it effectively:

Task: ${task}

Available Agent Templates:
${this.agentTemplates.map(template => `- ${template.name}: ${template.description}`).join('\n')}

Available Skills:
${this.availableSkills.map(skill => `- ${skill.name}: ${skill.description}`).join('\n')}

Provide a detailed analysis with:
1. The most appropriate agent template
2. 2-4 skills that would be beneficial for this task
3. Any specific tools that would be helpful
4. A brief explanation of why these selections are appropriate

Be thorough in your analysis to ensure the agent will be well-equipped to handle this specific task.`;

    // Get analysis from LLM
    const analysis = await this.getResponseFromLLM(analysisPrompt);
    
    // Store the analysis
    this.taskAnalysis = analysis;
  }

  /**
   * Build a specialized agent based on task analysis
   */
  private async buildSpecializedAgent(options: ProtocolExecutionOptions): Promise<void> {
    // Extract agent template and skills from analysis
    const templateMatch = this.taskAnalysis.match(/appropriate agent template:?\s*([^\n]+)/i) ||
                         this.taskAnalysis.match(/recommend(?:ed)? (?:the )?([^\n]+) template/i) ||
                         this.taskAnalysis.match(/([^\n]+) template would be best/i);
    
    const skillsMatch = this.taskAnalysis.match(/skills:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i) ||
                       this.taskAnalysis.match(/beneficial skills:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
    
    const toolsMatch = this.taskAnalysis.match(/tools:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i) ||
                      this.taskAnalysis.match(/helpful tools:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
    
    // Determine template
    let selectedTemplate = this.agentTemplates[0]; // Default to general template
    if (templateMatch) {
      const templateName = templateMatch[1].trim();
      const matchedTemplate = this.agentTemplates.find(t => 
        templateName.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(templateName.toLowerCase())
      );
      
      if (matchedTemplate) {
        selectedTemplate = matchedTemplate;
      }
    }
    
    // Determine skills
    let selectedSkills: AgentSkill[] = [];
    if (skillsMatch) {
      const skillsList = skillsMatch[1]
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const skillName of skillsList) {
        const matchedSkill = this.availableSkills.find(s => 
          skillName.toLowerCase().includes(s.name.toLowerCase()) ||
          s.name.toLowerCase().includes(skillName.toLowerCase())
        );
        
        if (matchedSkill && !selectedSkills.some(s => s.id === matchedSkill.id)) {
          selectedSkills.push(matchedSkill);
        }
      }
    }
    
    // If no skills were matched, select skills based on template compatibility
    if (selectedSkills.length === 0) {
      selectedSkills = this.availableSkills
        .filter(skill => selectedTemplate.skillCompatibility.includes(skill.id))
        .slice(0, 3); // Select up to 3 compatible skills
    }
    
    // Determine tools
    let selectedToolNames = [...selectedTemplate.defaultTools];
    
    // Add tools required by selected skills
    selectedSkills.forEach(skill => {
      skill.requiredTools.forEach(tool => {
        if (!selectedToolNames.includes(tool)) {
          selectedToolNames.push(tool);
        }
      });
    });
    
    // Add tools mentioned in the analysis
    if (toolsMatch) {
      const toolsList = toolsMatch[1]
        .split(/[,;\n]/)
        .map(t => t.trim())
        .filter(t => t.length > 0);
      
      toolsList.forEach(toolName => {
        const normalizedToolName = toolName.toLowerCase().replace(/\s+/g, '_');
        if (!selectedToolNames.includes(normalizedToolName)) {
          selectedToolNames.push(normalizedToolName);
        }
      });
    }
    
    // Build the agent prompt
    let fullPrompt = selectedTemplate.basePrompt + '\n\n';
    
    // Add skill enhancements
    if (selectedSkills.length > 0) {
      fullPrompt += 'Your specialized capabilities include:\n\n';
      
      selectedSkills.forEach(skill => {
        fullPrompt += skill.promptAddition + '\n\n';
      });
    }
    
    // Add task-specific instructions
    fullPrompt += `For this specific task, focus on applying these capabilities effectively while maintaining a helpful, clear, and thorough approach.`;
    
    // Create the built agent
    this.builtAgent = {
      name: `Specialized ${selectedTemplate.name}`,
      description: `A custom agent built for this specific task using the ${selectedTemplate.name} template`,
      skills: selectedSkills,
      fullPrompt,
      toolNames: selectedToolNames
    };
  }

  /**
   * Execute the task with the specialized agent
   */
  private async executeWithSpecializedAgent(task: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.builtAgent) {
      throw new Error('No agent has been built');
    }
    
    // Create prompt for the specialized agent
    const executionPrompt = `${this.builtAgent.fullPrompt}

Task: ${task}

${this.builtAgent.toolNames.length > 0 ? `You have access to the following tools:
${this.builtAgent.toolNames.join(', ')}

To use a tool, indicate it clearly in your response.` : ''}

Please complete this task thoroughly and effectively, showcasing your specialized capabilities.`;

    // Execute the task with the specialized agent
    const agentResponse = await this.getResponseFromLLM(executionPrompt);
    
    // Extract tool calls if any
    const toolCalls = this.extractToolCalls(agentResponse);
    
    // Execute tool calls if any
    const processedToolCalls = await this.processToolCalls(toolCalls, options);
    
    // Extract follow-up questions if any
    const followupQuestions = this.extractFollowupQuestions(agentResponse);
    
    // Store the execution result
    this.executionResult = {
      response: agentResponse,
      toolCalls: processedToolCalls,
      followupQuestions,
      thinking: `Agent execution using ${this.builtAgent.name} with ${this.builtAgent.skills.length} specialized skills`
    };
  }

  /**
   * Extract tool calls from agent response
   */
  private extractToolCalls(response: string): Array<{ tool: string, input: Record<string, any> }> {
    const toolCalls: Array<{ tool: string, input: Record<string, any> }> = [];
    
    // Look for tool call patterns in the response
    const toolCallPatterns = [
      /Using the (\w+) tool with (?:parameters|inputs):?\s*({[\s\S]*?})/gi,
      /I'll use the (\w+) tool:?\s*({[\s\S]*?})/gi,
      /Let me use (?:the )?(\w+)(?: tool)?:?\s*({[\s\S]*?})/gi
    ];
    
    for (const pattern of toolCallPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const toolName = match[1];
        const parametersJson = match[2];
        
        try {
          const parameters = JSON.parse(parametersJson);
          toolCalls.push({
            tool: toolName,
            input: parameters
          });
        } catch (error) {
          // If JSON parsing fails, try to extract key-value pairs
          const params: Record<string, any> = {};
          const keyValuePattern = /(\w+):\s*(?:"([^"]*)"|([\w.]+))/g;
          let kvMatch;
          
          while ((kvMatch = keyValuePattern.exec(parametersJson)) !== null) {
            const key = kvMatch[1];
            const value = kvMatch[2] || kvMatch[3];
            params[key] = value;
          }
          
          if (Object.keys(params).length > 0) {
            toolCalls.push({
              tool: toolName,
              input: params
            });
          }
        }
      }
    }
    
    return toolCalls;
  }

  /**
   * Process tool calls by executing the tools
   */
  private async processToolCalls(
    toolCalls: Array<{ tool: string, input: Record<string, any> }>,
    options: ProtocolExecutionOptions
  ): Promise<Array<{ tool: string, input: Record<string, any>, output: any }>> {
    const processedCalls: Array<{ tool: string, input: Record<string, any>, output: any }> = [];
    
    for (const call of toolCalls) {
      // Find the tool
      const tool = this.availableTools.find(t => 
        t.name.toLowerCase() === call.tool.toLowerCase() ||
        call.tool.toLowerCase().includes(t.name.toLowerCase())
      );
      
      if (tool) {
        try {
          // Call onToolUse callback if provided
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: tool.name,
              input: call.input,
              output: undefined,
              error: undefined
            });
          }
          
          // Execute the tool
          const output = await tool.execute(call.input);
          
          // Update the tool use callback with the result
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: tool.name,
              input: call.input,
              output,
              error: undefined
            });
          }
          
          processedCalls.push({
            tool: tool.name,
            input: call.input,
            output
          });
        } catch (error) {
          // Update the tool use callback with the error
          if (options.callbacks?.onToolUse) {
            options.callbacks.onToolUse({
              toolName: tool.name,
              input: call.input,
              output: undefined,
              error: (error as Error).message
            });
          }
          
          processedCalls.push({
            tool: tool.name,
            input: call.input,
            output: `Error: ${(error as Error).message}`
          });
        }
      } else {
        // Tool not found
        processedCalls.push({
          tool: call.tool,
          input: call.input,
          output: `Error: Tool "${call.tool}" not found`
        });
      }
    }
    
    return processedCalls;
  }

  /**
   * Extract follow-up questions from agent response
   */
  private extractFollowupQuestions(response: string): string[] {
    const questions: string[] = [];
    
    // Look for question patterns
    const sectionMatch = response.match(/(?:follow-up|follow up|additional) questions:?\s*([\s\S]*?)(?=\n\n|$)/i);
    
    if (sectionMatch) {
      const questionSection = sectionMatch[1];
      const questionPattern = /(?:^|\n)(?:\d+\.\s*|\*\s*|-\s*|Q\d+:\s*)([^\n?]+\?)/g;
      
      let match;
      while ((match = questionPattern.exec(questionSection)) !== null) {
        questions.push(match[1].trim());
      }
    } else {
      // Look for individual questions
      const questionPattern = /\n(?:\d+\.\s*|\*\s*|-\s*|Q\d+:\s*)([^\n?]+\?)/g;
      
      let match;
      while ((match = questionPattern.exec(response)) !== null) {
        questions.push(match[1].trim());
      }
    }
    
    return questions;
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(): string {
    if (!this.builtAgent || !this.executionResult) {
      return 'Error: Agent execution incomplete';
    }
    
    let response = `# Task Execution with ${this.builtAgent.name}\n\n`;
    
    // Add task analysis section
    response += `## Task Analysis\n`;
    response += `${this.taskAnalysis.split('\n').slice(0, 5).join('\n')}\n\n`;
    
    // Add agent configuration section
    response += `## Specialized Agent Configuration\n`;
    response += `**Template:** ${this.builtAgent.name}\n`;
    response += `**Skills:**\n`;
    this.builtAgent.skills.forEach(skill => {
      response += `- ${skill.name}: ${skill.description}\n`;
    });
    
    if (this.builtAgent.toolNames.length > 0) {
      response += `\n**Tools:** ${this.builtAgent.toolNames.join(', ')}\n`;
    }
    
    // Add execution result section
    response += `\n## Execution Result\n`;
    response += this.executionResult.response;
    
    // Add tool calls section if any
    if (this.executionResult.toolCalls && this.executionResult.toolCalls.length > 0) {
      response += `\n\n## Tool Usage\n`;
      this.executionResult.toolCalls.forEach((call, index) => {
        response += `### Tool Call ${index + 1}: ${call.tool}\n`;
        response += `**Input:**\n\`\`\`json\n${JSON.stringify(call.input, null, 2)}\n\`\`\`\n`;
        response += `**Output:**\n\`\`\`\n${typeof call.output === 'object' ? JSON.stringify(call.output, null, 2) : call.output}\n\`\`\`\n\n`;
      });
    }
    
    // Add follow-up questions section if any
    if (this.executionResult.followupQuestions && this.executionResult.followupQuestions.length > 0) {
      response += `\n## Follow-up Questions\n`;
      this.executionResult.followupQuestions.forEach((question, index) => {
        response += `${index + 1}. ${question}\n`;
      });
    }
    
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
    // Reset state
    this.builtAgent = null;
    this.taskAnalysis = '';
    this.executionResult = null;
    this.initialized = false;
    
    return Promise.resolve();
  }
}