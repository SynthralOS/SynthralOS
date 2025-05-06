/**
 * Agent Operation Understanding Layer
 * 
 * Provides a categorization and understanding layer for agent protocols based on their
 * operational strengths, capabilities, and recommended use cases.
 */

import { ProtocolRegistry } from './protocols/ProtocolRegistry';
import { log } from '../../vite';
import { ApiTool } from './types/AgentTools';
import OpenAI from 'openai';

/**
 * Agent Strength categories representing different operational capabilities
 */
export enum AgentStrength {
  AUTONOMOUS_TASKING = 'autonomous_tasking',
  MULTI_AGENT_TEAMWORK = 'multi_agent_teamwork',
  MICRO_TASK_HANDLING = 'micro_task_handling',
  CONTENT_SOCIAL_OPS = 'content_social_ops',
  CREATIVE_ROLEPLAY = 'creative_roleplay',
  DEVOPS_CODE = 'devops_code',
  FALLBACK_SELF_HEALING = 'fallback_self_healing',
  BUILD_ANYTHING = 'build_anything',
  CONNECTION_PROTOCOL = 'connection_protocol'
}

/**
 * Agent Protocol Classification
 */
export interface AgentClassification {
  protocol: string;
  name: string;
  primaryStrength: AgentStrength;
  secondaryStrengths: AgentStrength[];
  description: string;
  bestUseCases: string[];
  limitations: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  integrationLevel: 'standalone' | 'integrated' | 'orchestration';
}

/**
 * Classification registry for agent protocols
 */
export class AgentOperationLayer {
  private static instance: AgentOperationLayer;
  private registry: ProtocolRegistry;
  private classifications: Map<string, AgentClassification> = new Map();
  
  private constructor() {
    this.registry = ProtocolRegistry.getInstance();
    this.initializeClassifications();
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): AgentOperationLayer {
    if (!AgentOperationLayer.instance) {
      AgentOperationLayer.instance = new AgentOperationLayer();
    }
    return AgentOperationLayer.instance;
  }
  
  /**
   * Initialize the agent classifications
   */
  private initializeClassifications(): void {
    // AgentGPT - autonomous, capable of executing tasks with minimal guidance
    this.addClassification({
      protocol: 'AgentGPT',
      name: 'AgentGPT',
      primaryStrength: AgentStrength.AUTONOMOUS_TASKING,
      secondaryStrengths: [AgentStrength.FALLBACK_SELF_HEALING],
      description: 'General-purpose autonomous agent capable of executing complex tasks with reasoning.',
      bestUseCases: [
        'Complex research tasks requiring multiple steps',
        'Autonomous task planning and execution',
        'Generating detailed reports and analyses'
      ],
      limitations: [
        'Less effective for multi-agent collaborative tasks',
        'May struggle with very specialized domain knowledge',
        'No built-in code generation capabilities'
      ],
      complexity: 'beginner',
      integrationLevel: 'standalone'
    });
    
    // AutoGPT - autonomous, heavyweight agent for complex task decomposition
    this.addClassification({
      protocol: 'AutoGPT',
      name: 'Auto-GPT',
      primaryStrength: AgentStrength.AUTONOMOUS_TASKING,
      secondaryStrengths: [AgentStrength.BUILD_ANYTHING],
      description: 'Advanced autonomous agent capable of executing multi-step tasks with memory and planning.',
      bestUseCases: [
        'Complex problem solving requiring multiple sub-tasks',
        'Projects requiring memory of previous steps',
        'Tasks needing adaptive planning'
      ],
      limitations: [
        'High token consumption',
        'Can be slow for complex tasks',
        'May occasionally get stuck in loops'
      ],
      complexity: 'intermediate',
      integrationLevel: 'standalone'
    });
    
    // BabyAGI - autonomous, focused on task prioritization
    this.addClassification({
      protocol: 'BabyAGI',
      name: 'BabyAGI',
      primaryStrength: AgentStrength.AUTONOMOUS_TASKING,
      secondaryStrengths: [AgentStrength.FALLBACK_SELF_HEALING],
      description: 'Lightweight autonomous agent focused on task prioritization and execution.',
      bestUseCases: [
        'Task management with dynamic prioritization',
        'Projects requiring incremental progress tracking',
        'Research with evolving objectives'
      ],
      limitations: [
        'Limited memory compared to larger agents',
        'Less sophisticated planning than AutoGPT',
        'Not designed for multi-agent collaboration'
      ],
      complexity: 'beginner',
      integrationLevel: 'standalone'
    });
    
    // LangChain - connection protocol
    this.addClassification({
      protocol: 'LangChain',
      name: 'LangChain Protocol',
      primaryStrength: AgentStrength.CONNECTION_PROTOCOL,
      secondaryStrengths: [AgentStrength.BUILD_ANYTHING],
      description: 'Orchestration layer for connecting LLMs with external systems and tools.',
      bestUseCases: [
        'Building complex AI application workflows',
        'Tasks requiring integration with external tools',
        'Creating composable AI systems'
      ],
      limitations: [
        'Requires programming knowledge to implement',
        'Overhead for simple use cases',
        'API may change with version updates'
      ],
      complexity: 'intermediate',
      integrationLevel: 'integrated'
    });
    
    // MetaGPT - multi-agent teamwork for software development
    this.addClassification({
      protocol: 'MetaGPT',
      name: 'MetaGPT',
      primaryStrength: AgentStrength.MULTI_AGENT_TEAMWORK,
      secondaryStrengths: [AgentStrength.DEVOPS_CODE],
      description: 'Multi-agent system that simulates a software development team with specialized roles.',
      bestUseCases: [
        'Complete software application development',
        'Software architecture design',
        'Code generation with documentation'
      ],
      limitations: [
        'High token consumption across multiple agents',
        'Best for software-specific tasks',
        'Complex setup and configuration'
      ],
      complexity: 'advanced',
      integrationLevel: 'orchestration'
    });
    
    // CrewAI - multi-agent teamwork with role-based collaboration
    this.addClassification({
      protocol: 'CrewAI',
      name: 'CrewAI',
      primaryStrength: AgentStrength.MULTI_AGENT_TEAMWORK,
      secondaryStrengths: [AgentStrength.AUTONOMOUS_TASKING],
      description: 'Framework for creating teams of AI agents with different roles working together.',
      bestUseCases: [
        'Complex projects requiring multiple perspectives',
        'Tasks that benefit from specialized agent roles',
        'Collaborative problem-solving with role-based agents'
      ],
      limitations: [
        'Increased complexity in setup',
        'Higher inference costs with multiple agents',
        'Can be overkill for simple tasks'
      ],
      complexity: 'intermediate',
      integrationLevel: 'orchestration'
    });
    
    // AutoGen - multi-agent flexible team structure
    this.addClassification({
      protocol: 'AutoGen',
      name: 'AutoGen',
      primaryStrength: AgentStrength.MULTI_AGENT_TEAMWORK,
      secondaryStrengths: [AgentStrength.CREATIVE_ROLEPLAY],
      description: 'Framework for building conversational agents that can work together in versatile configurations.',
      bestUseCases: [
        'Human-AI collaborative workflows',
        'Multi-agent conversations',
        'Assistant-user-human conversational structures'
      ],
      limitations: [
        'Less structured than CrewAI for specific roles',
        'Requires more guidance for specialized tasks',
        'Works best with well-defined interaction patterns'
      ],
      complexity: 'intermediate',
      integrationLevel: 'orchestration'
    });
    
    // SmolAgents - micro-task handling with focused agents
    this.addClassification({
      protocol: 'SmolAgents',
      name: 'SmolAgents',
      primaryStrength: AgentStrength.MICRO_TASK_HANDLING,
      secondaryStrengths: [AgentStrength.BUILD_ANYTHING],
      description: 'Lightweight, efficient agents designed for focused micro-tasks.',
      bestUseCases: [
        'Simple, specific tasks with clear parameters',
        'Scenarios requiring minimal token usage',
        'Applications with many small task components'
      ],
      limitations: [
        'Limited reasoning for complex tasks',
        'Not suitable for tasks requiring extensive context',
        'Less autonomous than larger agent frameworks'
      ],
      complexity: 'beginner',
      integrationLevel: 'integrated'
    });
    
    // OpenInterpreter - code execution specialist
    this.addClassification({
      protocol: 'OpenInterpreter',
      name: 'Open Interpreter',
      primaryStrength: AgentStrength.MICRO_TASK_HANDLING,
      secondaryStrengths: [AgentStrength.DEVOPS_CODE],
      description: 'Natural language to code execution agent with local runtime capabilities.',
      bestUseCases: [
        'Converting natural language to executable code',
        'Performing system operations through conversation',
        'Automating programming and data analysis tasks'
      ],
      limitations: [
        'Focused primarily on code execution',
        'Security considerations for arbitrary code execution',
        'Less suited for non-coding tasks'
      ],
      complexity: 'intermediate',
      integrationLevel: 'standalone'
    });
    
    // KUSH-AI - social media/content operations
    this.addClassification({
      protocol: 'KUSHAI',
      name: 'KUSH AI',
      primaryStrength: AgentStrength.CONTENT_SOCIAL_OPS,
      secondaryStrengths: [AgentStrength.CREATIVE_ROLEPLAY],
      description: 'Specialized agent for social media content creation and optimization.',
      bestUseCases: [
        'Creating engaging social media content',
        'Planning content calendars and strategies',
        'Analyzing social media performance metrics'
      ],
      limitations: [
        'Specialized for social media use cases',
        'Less effective for general-purpose tasks',
        'May need fine-tuning for brand-specific voice'
      ],
      complexity: 'beginner',
      integrationLevel: 'standalone'
    });
    
    // InstagramAgent - visual social content specialist
    this.addClassification({
      protocol: 'InstagramAgent',
      name: 'Instagram Agent',
      primaryStrength: AgentStrength.CONTENT_SOCIAL_OPS,
      secondaryStrengths: [AgentStrength.CREATIVE_ROLEPLAY],
      description: 'Agent specialized for Instagram content creation and strategy.',
      bestUseCases: [
        'Creating Instagram-optimized captions and content',
        'Planning visual content strategies',
        'Analyzing Instagram engagement metrics'
      ],
      limitations: [
        'Platform-specific to Instagram',
        'Limited to social media context',
        'Requires integration with visual content tools'
      ],
      complexity: 'beginner',
      integrationLevel: 'standalone'
    });
    
    // RionaAI - conversational social assistant
    this.addClassification({
      protocol: 'RionaAI',
      name: 'Riona AI',
      primaryStrength: AgentStrength.CONTENT_SOCIAL_OPS,
      secondaryStrengths: [AgentStrength.CREATIVE_ROLEPLAY],
      description: 'Conversational agent designed for engaging personality-driven interactions.',
      bestUseCases: [
        'Creating engaging conversational content',
        'Personal assistant interactions',
        'Character-based customer service'
      ],
      limitations: [
        'Less suited for analytical tasks',
        'Optimized for conversation rather than problem-solving',
        'May vary in quality based on personality settings'
      ],
      complexity: 'intermediate',
      integrationLevel: 'standalone'
    });
    
    // Camel - creative roleplay agent
    this.addClassification({
      protocol: 'CamelAI',
      name: 'Camel AI',
      primaryStrength: AgentStrength.CREATIVE_ROLEPLAY,
      secondaryStrengths: [AgentStrength.MULTI_AGENT_TEAMWORK],
      description: 'AI framework for role-playing and simulating character interactions.',
      bestUseCases: [
        'Role-based creative writing and storytelling',
        'Simulating conversations between different personas',
        'Education through simulated scenarios'
      ],
      limitations: [
        'Less suited for analytical or data-driven tasks',
        'May generate creative rather than factual outputs',
        'Not optimized for problem-solving tasks'
      ],
      complexity: 'intermediate',
      integrationLevel: 'integrated'
    });
    
    // PR-Agent - code review specialist
    this.addClassification({
      protocol: 'PRAgent',
      name: 'PR Agent',
      primaryStrength: AgentStrength.DEVOPS_CODE,
      secondaryStrengths: [AgentStrength.FALLBACK_SELF_HEALING],
      description: 'Specialized agent for code review and pull request analysis.',
      bestUseCases: [
        'Automated code review for pull requests',
        'Identifying code quality issues',
        'Suggesting code improvements'
      ],
      limitations: [
        'Specialized for code review use cases',
        'Language and framework limitations',
        'May require domain-specific knowledge'
      ],
      complexity: 'advanced',
      integrationLevel: 'integrated'
    });
    
    // All-Hands - code testing agent
    this.addClassification({
      protocol: 'AllHands',
      name: 'All-Hands',
      primaryStrength: AgentStrength.DEVOPS_CODE,
      secondaryStrengths: [AgentStrength.FALLBACK_SELF_HEALING],
      description: 'Agent focused on generating and executing test cases for code.',
      bestUseCases: [
        'Generating comprehensive test cases',
        'Test-driven development assistance',
        'Finding edge cases in code'
      ],
      limitations: [
        'Focuses primarily on testing',
        'Language and framework limitations',
        'May need guidance for complex systems'
      ],
      complexity: 'advanced',
      integrationLevel: 'integrated'
    });
    
    // AutoBuilder - code generation specialist
    this.addClassification({
      protocol: 'AutoBuilder',
      name: 'AutoBuilder',
      primaryStrength: AgentStrength.DEVOPS_CODE,
      secondaryStrengths: [AgentStrength.BUILD_ANYTHING],
      description: 'Agent specialized in generating full applications from specifications.',
      bestUseCases: [
        'Generating complete applications from requirements',
        'Transforming mockups to functional code',
        'Prototyping software solutions'
      ],
      limitations: [
        'May require refinement for production-ready code',
        'Framework and language limitations',
        'Complex architectures may need human guidance'
      ],
      complexity: 'advanced',
      integrationLevel: 'orchestration'
    });
    
    // Archon - self-healing agent framework
    this.addClassification({
      protocol: 'Archon',
      name: 'Archon',
      primaryStrength: AgentStrength.FALLBACK_SELF_HEALING,
      secondaryStrengths: [AgentStrength.AUTONOMOUS_TASKING],
      description: 'Robust agent framework with self-correction and resilience features.',
      bestUseCases: [
        'Mission-critical applications requiring high reliability',
        'Tasks requiring error recovery and self-healing',
        'Long-running autonomous operations'
      ],
      limitations: [
        'Higher complexity and overhead',
        'May be slower due to verification steps',
        'Additional resources for monitoring and recovery'
      ],
      complexity: 'advanced',
      integrationLevel: 'orchestration'
    });
    
    // Kortix/Suna - general build-anything framework
    this.addClassification({
      protocol: 'Kortix',
      name: 'Kortix/Suna',
      primaryStrength: AgentStrength.BUILD_ANYTHING,
      secondaryStrengths: [AgentStrength.AUTONOMOUS_TASKING],
      description: 'Versatile agent framework designed for creating and connecting AI applications.',
      bestUseCases: [
        'Rapid prototyping of AI-powered applications',
        'Creating custom workflows with multiple agents',
        'Building and deploying integrated AI solutions'
      ],
      limitations: [
        'May require technical knowledge to fully utilize',
        'Less specialized than domain-specific agents',
        'General-purpose nature can be less optimal for specific tasks'
      ],
      complexity: 'intermediate',
      integrationLevel: 'orchestration'
    });
    
    // ACP - Agent Communication Protocol
    this.addClassification({
      protocol: 'ACP',
      name: 'Agent Communication Protocol',
      primaryStrength: AgentStrength.CONNECTION_PROTOCOL,
      secondaryStrengths: [AgentStrength.MULTI_AGENT_TEAMWORK],
      description: 'Standard protocol for agent-to-agent communication and interoperability.',
      bestUseCases: [
        'Creating interoperable agent ecosystems',
        'Building multi-agent systems with heterogeneous agents',
        'Standardizing agent interaction patterns'
      ],
      limitations: [
        'Overhead for simple agent implementations',
        'Requires adoption across agent frameworks',
        'Still evolving as a standard'
      ],
      complexity: 'advanced',
      integrationLevel: 'integrated'
    });
    
    // OAP - Open Agent Protocol
    this.addClassification({
      protocol: 'OAP',
      name: 'Open Agent Protocol',
      primaryStrength: AgentStrength.CONNECTION_PROTOCOL,
      secondaryStrengths: [AgentStrength.AUTONOMOUS_TASKING],
      description: 'Open standard for agent interactions and interoperability.',
      bestUseCases: [
        'Creating open ecosystems of interoperable agents',
        'Standardizing tool and agent interactions',
        'Building plugin systems for agents'
      ],
      limitations: [
        'Adoption still growing across frameworks',
        'Implementation complexity for full specification',
        'May evolve with future versions'
      ],
      complexity: 'advanced',
      integrationLevel: 'integrated'
    });
    
    // A2A - Agent-to-Agent Messaging
    this.addClassification({
      protocol: 'A2A',
      name: 'Agent-to-Agent Protocol',
      primaryStrength: AgentStrength.CONNECTION_PROTOCOL,
      secondaryStrengths: [AgentStrength.MULTI_AGENT_TEAMWORK],
      description: 'Lightweight protocol for direct agent-to-agent communication.',
      bestUseCases: [
        'Simple agent message passing',
        'Direct agent collaboration patterns',
        'Building agent networks with minimal overhead'
      ],
      limitations: [
        'Less comprehensive than full communication protocols',
        'May need extension for complex interactions',
        'Limited standardization across frameworks'
      ],
      complexity: 'intermediate',
      integrationLevel: 'integrated'
    });
  }
  
  /**
   * Add a classification for an agent protocol
   */
  private addClassification(classification: AgentClassification): void {
    this.classifications.set(classification.protocol, classification);
    log(`Registered classification for protocol: ${classification.protocol}`, 'agent');
  }
  
  /**
   * Get classification for a protocol
   */
  public getClassification(protocol: string): AgentClassification | undefined {
    return this.classifications.get(protocol);
  }
  
  /**
   * Get all classifications
   */
  public getAllClassifications(): AgentClassification[] {
    return Array.from(this.classifications.values());
  }
  
  /**
   * Get protocols by primary strength
   */
  public getProtocolsByStrength(strength: AgentStrength): AgentClassification[] {
    return Array.from(this.classifications.values())
      .filter(classification => classification.primaryStrength === strength);
  }
  
  /**
   * Get protocols by complexity level
   */
  public getProtocolsByComplexity(complexity: 'beginner' | 'intermediate' | 'advanced'): AgentClassification[] {
    return Array.from(this.classifications.values())
      .filter(classification => classification.complexity === complexity);
  }
  
  /**
   * Get protocols that have a specific strength (either primary or secondary)
   */
  public getProtocolsWithStrength(strength: AgentStrength): AgentClassification[] {
    return Array.from(this.classifications.values())
      .filter(classification => 
        classification.primaryStrength === strength || 
        classification.secondaryStrengths.includes(strength)
      );
  }
  
  /**
   * Recommend protocol based on task description
   */
  public async recommendProtocols(task: string): Promise<{ 
    recommended: AgentClassification[];
    reasoning: string;
  }> {
    try {
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        // Fallback to rule-based recommendation
        return this.ruleBasedRecommendation(task);
      }
      
      // Use AI to recommend protocols
      return await this.aiBasedRecommendation(task);
    } catch (error) {
      log(`Error recommending protocols: ${error}`, 'agent');
      // Fallback to rule-based recommendation on error
      return this.ruleBasedRecommendation(task);
    }
  }
  
  /**
   * Rule-based recommendation fallback
   */
  private ruleBasedRecommendation(task: string): {
    recommended: AgentClassification[];
    reasoning: string;
  } {
    const taskLower = task.toLowerCase();
    
    // Check for common keywords and phrases
    const matchingProtocols: AgentClassification[] = [];
    
    if (taskLower.includes('code') || taskLower.includes('program') || taskLower.includes('develop')) {
      const devProtocols = this.getProtocolsWithStrength(AgentStrength.DEVOPS_CODE);
      matchingProtocols.push(...devProtocols);
    }
    
    if (taskLower.includes('social') || taskLower.includes('content') || taskLower.includes('post')) {
      const socialProtocols = this.getProtocolsWithStrength(AgentStrength.CONTENT_SOCIAL_OPS);
      matchingProtocols.push(...socialProtocols);
    }
    
    if (taskLower.includes('team') || taskLower.includes('collaborate') || taskLower.includes('multiple')) {
      const teamProtocols = this.getProtocolsWithStrength(AgentStrength.MULTI_AGENT_TEAMWORK);
      matchingProtocols.push(...teamProtocols);
    }
    
    if (taskLower.includes('creative') || taskLower.includes('story') || taskLower.includes('character')) {
      const creativeProtocols = this.getProtocolsWithStrength(AgentStrength.CREATIVE_ROLEPLAY);
      matchingProtocols.push(...creativeProtocols);
    }
    
    // Default to autonomous tasking if no specific matches
    if (matchingProtocols.length === 0) {
      const autoProtocols = this.getProtocolsWithStrength(AgentStrength.AUTONOMOUS_TASKING);
      matchingProtocols.push(...autoProtocols);
    }
    
    // Deduplicate and limit to top 3
    const uniqueProtocols = Array.from(new Map(
      matchingProtocols.map(p => [p.protocol, p])
    ).values()).slice(0, 3);
    
    return {
      recommended: uniqueProtocols,
      reasoning: "Based on keywords in your task description, these protocols may be most suitable. For more accurate recommendations, please enable OpenAI API integration."
    };
  }
  
  /**
   * AI-based recommendation using OpenAI
   */
  private async aiBasedRecommendation(task: string): Promise<{
    recommended: AgentClassification[];
    reasoning: string;
  }> {
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      
      // Prepare protocol descriptions for context
      const protocolDescriptions = Array.from(this.classifications.values())
        .map(c => `${c.protocol}: ${c.description} (Primary strength: ${this.strengthToHumanReadable(c.primaryStrength)})`);
      
      // Create the prompt
      const systemPrompt = `You are an AI protocol selection assistant. Your job is to recommend the best agent protocols
for a given task. Consider the task carefully and select 1-3 most appropriate protocols from the list below.
Provide a brief explanation of why you selected these protocols.

Available protocols:
${protocolDescriptions.join('\n')}`;
      
      const userPrompt = `Task: ${task}
Please provide your recommendations in JSON format with the following structure:
{
  "recommended": ["Protocol1", "Protocol2"],
  "reasoning": "Brief explanation of why these protocols are recommended."
}`;
      
      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.2
      });
      
      // Parse the response
      const content = response.choices[0].message.content;
      if (!content) throw new Error("Empty response from OpenAI");
      
      const result = JSON.parse(content);
      
      // Validate and map the recommended protocols to their full classifications
      const recommendedProtocols = (result.recommended || [])
        .map((name: string) => {
          // Try to find by exact protocol name first
          let classification = this.getClassification(name);
          
          // If not found, try case-insensitive search
          if (!classification) {
            const allClassifications = this.getAllClassifications();
            classification = allClassifications.find(c => 
              c.protocol.toLowerCase() === name.toLowerCase() || 
              c.name.toLowerCase() === name.toLowerCase()
            );
          }
          
          return classification;
        })
        .filter((c): c is AgentClassification => c !== undefined);
      
      // If no valid recommendations, fall back to rule-based
      if (recommendedProtocols.length === 0) {
        return this.ruleBasedRecommendation(task);
      }
      
      return {
        recommended: recommendedProtocols,
        reasoning: result.reasoning || "These protocols were selected based on their capabilities matching your task requirements."
      };
    } catch (error) {
      log(`Error in AI-based recommendation: ${error}`, 'agent');
      return this.ruleBasedRecommendation(task);
    }
  }
  
  /**
   * Convert strength enum to human readable name
   */
  private strengthToHumanReadable(strength: AgentStrength): string {
    switch (strength) {
      case AgentStrength.AUTONOMOUS_TASKING:
        return 'Autonomous Task Execution';
      case AgentStrength.MULTI_AGENT_TEAMWORK:
        return 'Multi-Agent Teamwork';
      case AgentStrength.MICRO_TASK_HANDLING:
        return 'Micro-Task Handling';
      case AgentStrength.CONTENT_SOCIAL_OPS:
        return 'Content & Social Operations';
      case AgentStrength.CREATIVE_ROLEPLAY:
        return 'Creative Roleplay';
      case AgentStrength.DEVOPS_CODE:
        return 'DevOps & Code Generation';
      case AgentStrength.FALLBACK_SELF_HEALING:
        return 'Fallback & Self-Healing';
      case AgentStrength.BUILD_ANYTHING:
        return 'Build Anything Platform';
      case AgentStrength.CONNECTION_PROTOCOL:
        return 'Connection Protocol';
      default:
        return String(strength);
    }
  }
}

// Singleton instance export
export const agentOperationLayer = AgentOperationLayer.getInstance();