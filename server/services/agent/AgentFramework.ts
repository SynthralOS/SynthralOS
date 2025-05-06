/**
 * AgentFramework - Central management service for agent protocols
 * 
 * This service ties together all the agent protocols and provides
 * a unified interface for working with different agent frameworks.
 */

import { 
  BaseProtocol, 
  ProtocolCapabilities, 
  ProtocolConfig, 
  ProtocolMetadata, 
  ProtocolExecutionOptions,
  ExecutionMode
} from './protocols/BaseProtocol';
import { ProtocolRegistry } from './protocols/ProtocolRegistry';
import { AgentGPTProtocol } from './protocols/AgentGPTProtocol';
import { AutoGPTProtocol } from './protocols/AutoGPTProtocol';
import { MetaGPTProtocol } from './protocols/MetaGPTProtocol';
import { CrewAIProtocol } from './protocols/CrewAIProtocol';
import { OpenInterpreterProtocol } from './protocols/OpenInterpreterProtocol';
import { ArchonProtocol } from './protocols/ArchonProtocol';
import { BabyAGIProtocol } from './protocols/BabyAGIProtocol';
import { KUSHAIProtocol } from './protocols/KUSHAIProtocol';
import { InstagramAgentProtocol } from './protocols/InstagramAgentProtocol';
import { RionaAIProtocol } from './protocols/RionaAIProtocol';
import { KyroProtocol } from './protocols/KyroProtocol';
import { CamelAIProtocol } from './protocols/CamelAIProtocol';
import { AutoGenProtocol } from './protocols/AutoGenProtocol';
import { SmolAgentsProtocol } from './protocols/SmolAgentsProtocol';
import { AllHandsProtocol } from './protocols/AllHandsProtocol';
import { QodoPRAgentProtocol } from './protocols/QodoPRAgentProtocol';
import { MSAgentAutoBuilderProtocol } from './protocols/MSAgentAutoBuilderProtocol';
import { KortixBuilderProtocol } from './protocols/KortixBuilderProtocol';
import { AgentKitGoogleProtocol } from './protocols/AgentKitGoogleProtocol';
import { MCPServerProtocol } from './protocols/MCPServerProtocol';
import { Agent, AgentFactory, AgentType, AgentResponse, AgentTool } from './agent';
import { log } from '../../vite';
import { agentOperationLayer, AgentStrength, AgentClassification } from './AgentOperationLayer';

/**
 * Agent Framework execution result
 */
export interface AgentFrameworkExecutionResult {
  response: AgentResponse;
  protocol: string;
  executionTime: number;
  metadata: {
    protocolVersion: string;
    model: string;
    startTime: Date;
    endTime: Date;
    status: 'success' | 'error';
    errorMessage?: string;
  };
}

/**
 * Agent Framework configuration
 */
export interface AgentFrameworkConfig {
  defaultProtocol: string;
  defaultTools: AgentTool[];
  apiKeys: {
    anthropic?: string;
    openai?: string;
    // Add other API keys as needed
  };
  registry?: ProtocolRegistry;
}

/**
 * Agent Framework service
 */
export class AgentFramework {
  private static instance: AgentFramework;
  private registry: ProtocolRegistry;
  private config: AgentFrameworkConfig;
  private initialized: boolean = false;

  /**
   * Private constructor for singleton pattern
   */
  private constructor(config: AgentFrameworkConfig) {
    this.config = config;
    this.registry = config.registry || ProtocolRegistry.getInstance();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: AgentFrameworkConfig): AgentFramework {
    if (!AgentFramework.instance) {
      if (!config) {
        throw new Error('Initial configuration required for AgentFramework');
      }
      AgentFramework.instance = new AgentFramework(config);
    } else if (config) {
      // Update config if provided
      AgentFramework.instance.config = {
        ...AgentFramework.instance.config,
        ...config
      };
    }
    
    return AgentFramework.instance;
  }

  /**
   * Initialize the framework
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    try {
      // Register all supported protocols
      this.registerAllProtocols();
      
      this.initialized = true;
      log('AgentFramework initialized successfully', 'agent');
    } catch (error) {
      log(`Error initializing AgentFramework: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Register all supported protocols
   */
  private registerAllProtocols(): void {
    // Register AgentGPT (simple one-shot agents)
    this.registry.registerProtocol(
      'agentgpt',
      AgentGPTProtocol as any,
      new AgentGPTProtocol().getMetadata()
    );
    
    // Register AutoGPT (recursive planning)
    this.registry.registerProtocol(
      'autogpt',
      AutoGPTProtocol as any,
      new AutoGPTProtocol().getMetadata()
    );
    
    // Register MetaGPT (role-based teamwork)
    this.registry.registerProtocol(
      'metagpt',
      MetaGPTProtocol as any,
      new MetaGPTProtocol().getMetadata()
    );
    
    // Register CrewAI (multi-role, goal-driven)
    this.registry.registerProtocol(
      'crewai',
      CrewAIProtocol as any,
      new CrewAIProtocol().getMetadata()
    );
    
    // Register OpenInterpreter (code execution)
    this.registry.registerProtocol(
      'openinterpreter',
      OpenInterpreterProtocol as any,
      new OpenInterpreterProtocol().getMetadata()
    );
    
    // Register Archon (self-healing, error correction)
    this.registry.registerProtocol(
      'archon',
      ArchonProtocol as any,
      new ArchonProtocol().getMetadata()
    );
    
    // Register BabyAGI (task decomposition and LLM-based prioritization)
    this.registry.registerProtocol(
      'babyagi',
      BabyAGIProtocol as any,
      new BabyAGIProtocol().getMetadata()
    );
    
    // Register KUSH AI (blog post generation)
    this.registry.registerProtocol(
      'kushai',
      KUSHAIProtocol as any,
      new KUSHAIProtocol().getMetadata()
    );
    
    // Register Instagram AI Agent (image-based content automation)
    this.registry.registerProtocol(
      'instagramagent',
      InstagramAgentProtocol as any,
      new InstagramAgentProtocol().getMetadata()
    );
    
    // Register Riona AI (Twitter/GitHub monitoring)
    this.registry.registerProtocol(
      'rionaai',
      RionaAIProtocol as any,
      new RionaAIProtocol().getMetadata()
    );
    
    // Register Kyro (serverless automation)
    this.registry.registerProtocol(
      'kyro',
      KyroProtocol as any,
      new KyroProtocol().getMetadata()
    );
    
    // Register CamelAI (collaborative roleplay agents)
    this.registry.registerProtocol(
      'camelai',
      CamelAIProtocol as any,
      new CamelAIProtocol().getMetadata()
    );
    
    // Register AutoGen (Microsoft's collaborative agent planning)
    this.registry.registerProtocol(
      'autogen',
      AutoGenProtocol as any,
      new AutoGenProtocol().getMetadata()
    );
    
    // Register SmolAgents (tiny, lightweight MCP-embedded agents)
    this.registry.registerProtocol(
      'smolagents',
      SmolAgentsProtocol as any,
      new SmolAgentsProtocol().getMetadata()
    );
    
    // Register All-Hands (dev multi-agent orchestration)
    this.registry.registerProtocol(
      'allhands',
      AllHandsProtocol as any,
      new AllHandsProtocol().getMetadata()
    );
    
    // Register Qodo PR-Agent (GitHub PR auto-summarization)
    this.registry.registerProtocol(
      'qodopr',
      QodoPRAgentProtocol as any,
      new QodoPRAgentProtocol().getMetadata()
    );
    
    // Register Microsoft Agent AutoBuilder (dynamic agent assembly)
    this.registry.registerProtocol(
      'msagentautobuilder',
      MSAgentAutoBuilderProtocol as any,
      new MSAgentAutoBuilderProtocol().getMetadata()
    );
    
    // Register Kortix/Suna.so Builder (visual workflow designer)
    this.registry.registerProtocol(
      'kortixbuilder',
      KortixBuilderProtocol as any,
      new KortixBuilderProtocol().getMetadata()
    );
    
    // Register Agent Kit by Google (component-based agent scaffolding)
    this.registry.registerProtocol(
      'agentkitgoogle',
      AgentKitGoogleProtocol as any,
      new AgentKitGoogleProtocol().getMetadata()
    );
    
    // Register MCP Server (message control protocol for distributed agents)
    this.registry.registerProtocol(
      'mcpserver',
      MCPServerProtocol as any,
      new MCPServerProtocol().getMetadata()
    );
  }

  /**
   * Execute a task using a specific protocol
   */
  public async executeWithProtocol(
    protocolName: string,
    task: string,
    options: Partial<ProtocolExecutionOptions> = {},
    config: Partial<ProtocolConfig> = {}
  ): Promise<AgentFrameworkExecutionResult> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check if protocol exists
    if (!this.registry.hasProtocol(protocolName)) {
      throw new Error(`Protocol '${protocolName}' not found`);
    }
    
    const startTime = Date.now();
    const executionStartTime = new Date();
    
    try {
      // Create protocol instance
      const protocol = this.registry.createProtocolInstance(protocolName);
      const metadata = this.registry.getProtocolMetadata(protocolName);
      
      // Prepare configuration
      const protocolConfig: ProtocolConfig = {
        ...config,
        tools: config.tools || this.config.defaultTools
      };
      
      // Initialize protocol
      await protocol.init(protocolConfig);
      
      // Prepare execution options
      const executionOptions: ProtocolExecutionOptions = {
        task,
        tools: protocolConfig.tools,
        ...options
      };
      
      // Execute the task
      const response = await protocol.execute(executionOptions);
      
      // Clean up protocol resources
      await protocol.cleanup();
      
      const endTime = new Date();
      const executionTime = Date.now() - startTime;
      
      // Return the result
      return {
        response,
        protocol: protocolName,
        executionTime,
        metadata: {
          protocolVersion: metadata.version,
          model: protocolConfig.modelName || 'unknown',
          startTime: executionStartTime,
          endTime,
          status: 'success'
        }
      };
    } catch (error) {
      const endTime = new Date();
      const executionTime = Date.now() - startTime;
      
      log(`Error executing protocol '${protocolName}': ${error}`, 'agent');
      
      // Return error result
      return {
        response: {
          response: `Error executing protocol '${protocolName}': ${(error as Error).message}`,
          executionTime
        },
        protocol: protocolName,
        executionTime,
        metadata: {
          protocolVersion: this.registry.getProtocolMetadata(protocolName).version,
          model: config.modelName || 'unknown',
          startTime: executionStartTime,
          endTime,
          status: 'error',
          errorMessage: (error as Error).message
        }
      };
    }
  }

  /**
   * Choose the best protocol for a given task
   */
  public async chooseBestProtocol(
    task: string,
    requiredCapabilities: ProtocolCapabilities[] = []
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get all registered protocols
    const protocols = this.registry.listProtocols();
    
    // Filter protocols by required capabilities
    const compatibleProtocols = protocols.filter(p => 
      requiredCapabilities.every(capability => 
        p.metadata.capabilities.includes(capability)
      )
    );
    
    if (compatibleProtocols.length === 0) {
      // Fall back to default if no compatible protocols
      return this.config.defaultProtocol;
    }
    
    // First try using the Agent Operation Layer to get more intelligent recommendations
    try {
      const recommendations = await agentOperationLayer.recommendProtocols(task);
      if (recommendations.recommended.length > 0) {
        // Find the first recommended protocol that is also compatible with required capabilities
        const compatibleRecommendation = recommendations.recommended.find(rec => 
          compatibleProtocols.some(p => p.name === rec.protocol)
        );
        
        if (compatibleRecommendation) {
          return compatibleRecommendation.protocol;
        }
      }
    } catch (error) {
      log(`Error using Agent Operation Layer for recommendations: ${error}`, 'agent');
      // Continue with fallback keyword-based matching
    }
    
    // Simple heuristic to choose the protocol based on task keywords
    const taskLower = task.toLowerCase();
    
    // Specific task type matches
    
    // If the task mentions GitHub PR or code review, prefer QodoPR
    if ((taskLower.includes('github') || taskLower.includes('git')) && 
        (taskLower.includes('pr') || taskLower.includes('pull request') || taskLower.includes('review'))) {
      const qodopr = compatibleProtocols.find(p => p.name === 'qodopr');
      if (qodopr) {
        return 'qodopr';
      }
    }
    
    // If the task mentions Instagram or content planning, prefer InstagramAgent
    if (taskLower.includes('instagram') || 
        (taskLower.includes('social media') && taskLower.includes('image'))) {
      const instagramAgent = compatibleProtocols.find(p => p.name === 'instagramagent');
      if (instagramAgent) {
        return 'instagramagent';
      }
    }
    
    // If the task mentions Twitter monitoring, prefer RionaAI
    if ((taskLower.includes('twitter') || taskLower.includes('monitor')) && 
        (taskLower.includes('git') || taskLower.includes('social'))) {
      const rionaAI = compatibleProtocols.find(p => p.name === 'rionaai');
      if (rionaAI) {
        return 'rionaai';
      }
    }
    
    // If the task mentions blog writing, prefer KUSHAI
    if (taskLower.includes('blog') || taskLower.includes('article') || 
        (taskLower.includes('write') && taskLower.includes('content'))) {
      const kushai = compatibleProtocols.find(p => p.name === 'kushai');
      if (kushai) {
        return 'kushai';
      }
    }
    
    // If the task mentions serverless or mentions efficiency, prefer Kyro
    if (taskLower.includes('serverless') || 
        (taskLower.includes('efficien') && taskLower.includes('automat'))) {
      const kyro = compatibleProtocols.find(p => p.name === 'kyro');
      if (kyro) {
        return 'kyro';
      }
    }
    
    // If the task mentions software development or repository, prefer All-Hands
    if ((taskLower.includes('software') || taskLower.includes('repository') || 
         taskLower.includes('repo')) && 
        (taskLower.includes('develop') || taskLower.includes('build'))) {
      const allHands = compatibleProtocols.find(p => p.name === 'allhands');
      if (allHands) {
        return 'allhands';
      }
    }
    
    // If the task mentions role-play or collaboration conversation, prefer CamelAI
    if (taskLower.includes('roleplay') || taskLower.includes('role play') || 
        (taskLower.includes('conversation') && taskLower.includes('two'))) {
      const camelAI = compatibleProtocols.find(p => p.name === 'camelai');
      if (camelAI) {
        return 'camelai';
      }
    }
    
    // General capability matches
    
    // If the task mentions code or programming, prefer OpenInterpreter
    if (taskLower.includes('code') || 
        taskLower.includes('program') || 
        taskLower.includes('script')) {
      const openInterpreter = compatibleProtocols.find(p => p.name === 'openinterpreter');
      if (openInterpreter) {
        return 'openinterpreter';
      }
    }
    
    // If the task mentions resource constraints or efficiency, prefer SmolAgents
    if (taskLower.includes('efficien') || 
        taskLower.includes('resource constraint') || 
        taskLower.includes('minimal') || 
        taskLower.includes('lightweight')) {
      const smolAgents = compatibleProtocols.find(p => p.name === 'smolagents');
      if (smolAgents) {
        return 'smolagents';
      }
    }
    
    // If the task mentions collaboration with tools, prefer AutoGen
    if ((taskLower.includes('collaborat') || taskLower.includes('team')) && 
        taskLower.includes('tool')) {
      const autogen = compatibleProtocols.find(p => p.name === 'autogen');
      if (autogen) {
        return 'autogen';
      }
    }
    
    // If the task mentions prioritization, prefer BabyAGI
    if (taskLower.includes('priorit') || 
        taskLower.includes('task list') || 
        taskLower.includes('organize tasks')) {
      const babyagi = compatibleProtocols.find(p => p.name === 'babyagi');
      if (babyagi) {
        return 'babyagi';
      }
    }
    
    // If the task mentions collaboration or roles, prefer MetaGPT or CrewAI
    if (taskLower.includes('team') || 
        taskLower.includes('collaborate') || 
        taskLower.includes('role')) {
      const metagpt = compatibleProtocols.find(p => p.name === 'metagpt');
      if (metagpt) {
        return 'metagpt';
      }
      
      const crewai = compatibleProtocols.find(p => p.name === 'crewai');
      if (crewai) {
        return 'crewai';
      }
    }
    
    // If the task seems complex and multi-step, prefer AutoGPT
    if (taskLower.includes('complex') || 
        task.length > 100 || 
        task.split(' ').length > 15) {
      const autogpt = compatibleProtocols.find(p => p.name === 'autogpt');
      if (autogpt) {
        return 'autogpt';
      }
    }
    
    // If resilience or error recovery is important, prefer Archon
    if (taskLower.includes('error') || 
        taskLower.includes('resilient') || 
        taskLower.includes('recover')) {
      const archon = compatibleProtocols.find(p => p.name === 'archon');
      if (archon) {
        return 'archon';
      }
    }
    
    // If the task involves message passing or multiple agents coordinating, prefer MCP Server
    if ((taskLower.includes('message') || taskLower.includes('communication')) && 
        (taskLower.includes('agent') || taskLower.includes('multi-agent') || taskLower.includes('multiagent'))) {
      const mcpserver = compatibleProtocols.find(p => p.name === 'mcpserver');
      if (mcpserver) {
        return 'mcpserver';
      }
    }
    
    // Default to AgentGPT for simple tasks or fall back to the first compatible protocol
    const agentgpt = compatibleProtocols.find(p => p.name === 'agentgpt');
    if (agentgpt) {
      return 'agentgpt';
    }
    
    return compatibleProtocols[0].name;
  }

  /**
   * Execute a task with automatic protocol selection
   */
  public async execute(
    task: string,
    options: Partial<ProtocolExecutionOptions> = {},
    config: Partial<ProtocolConfig> = {},
    requiredCapabilities: ProtocolCapabilities[] = []
  ): Promise<AgentFrameworkExecutionResult> {
    // Choose the best protocol for the task
    const protocolName = await this.chooseBestProtocol(task, requiredCapabilities);
    
    // Execute with the chosen protocol
    return this.executeWithProtocol(protocolName, task, options, config);
  }

  /**
   * Get all supported protocols
   */
  public getAllProtocols(): Array<{ name: string; metadata: ProtocolMetadata }> {
    return this.registry.listProtocols();
  }

  /**
   * Get protocol metadata
   */
  public getProtocolMetadata(protocolName: string): ProtocolMetadata {
    return this.registry.getProtocolMetadata(protocolName);
  }

  /**
   * Check if a protocol is supported
   */
  public isProtocolSupported(protocolName: string): boolean {
    return this.registry.hasProtocol(protocolName);
  }

  /**
   * Get protocol registry
   */
  public getRegistry(): ProtocolRegistry {
    return this.registry;
  }

  /**
   * Get current configuration
   */
  public getConfig(): AgentFrameworkConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<AgentFrameworkConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
  }

  /**
   * Get protocols by strength category
   */
  public getProtocolsByStrength(strength: AgentStrength): Array<{ name: string; metadata: ProtocolMetadata }> {
    if (!this.initialized) {
      throw new Error('AgentFramework not initialized');
    }
    
    // Get classifications that match the strength
    const matchingClassifications = agentOperationLayer.getProtocolsByStrength(strength);
    
    log(`Found ${matchingClassifications.length} classifications with primary strength ${strength}`, 'agent');
    
    // Debug: List matching classification protocols
    if (matchingClassifications.length > 0) {
      log(`Matching protocol names: ${matchingClassifications.map(c => c.protocol).join(', ')}`, 'agent');
    }
    
    // Get protocols from the registry that match these classifications
    const result = matchingClassifications
      .map(classification => {
        // Find the protocol in registry regardless of case
        const protocolNames = Array.from(this.registry.listProtocols().map(p => p.name));
        const matchedProtocol = protocolNames.find(
          name => name.toLowerCase() === classification.protocol.toLowerCase()
        );
        
        const hasProtocol = !!matchedProtocol;
        log(`Protocol ${classification.protocol} exists in registry: ${hasProtocol}`, 'agent');
        
        if (hasProtocol) {
          return {
            name: classification.protocol,
            metadata: this.registry.getProtocolMetadata(matchedProtocol!)
          };
        }
        return null;
      })
      .filter((p): p is { name: string; metadata: ProtocolMetadata } => p !== null);
      
    log(`Returning ${result.length} protocols for strength ${strength}`, 'agent');
    return result;
  }

  /**
   * Get protocols with a specific strength (primary or secondary)
   */
  public getProtocolsWithStrength(strength: AgentStrength): Array<{ name: string; metadata: ProtocolMetadata }> {
    if (!this.initialized) {
      throw new Error('AgentFramework not initialized');
    }
    
    // Get classifications that have the strength either as primary or secondary
    const matchingClassifications = agentOperationLayer.getProtocolsWithStrength(strength);
    
    // Get protocols from the registry that match these classifications
    return matchingClassifications
      .map(classification => {
        // Find the protocol in registry regardless of case
        const protocolNames = Array.from(this.registry.listProtocols().map(p => p.name));
        const matchedProtocol = protocolNames.find(
          name => name.toLowerCase() === classification.protocol.toLowerCase()
        );
        
        if (matchedProtocol) {
          return {
            name: classification.protocol,
            metadata: this.registry.getProtocolMetadata(matchedProtocol)
          };
        }
        return null;
      })
      .filter((p): p is { name: string; metadata: ProtocolMetadata } => p !== null);
  }

  /**
   * Get protocol classifications
   */
  public getProtocolClassifications(): AgentClassification[] {
    return agentOperationLayer.getAllClassifications();
  }

  /**
   * Get recommended protocols for a task with reasoning
   */
  public async getRecommendedProtocols(task: string): Promise<{ 
    recommended: AgentClassification[], 
    reasoning: string 
  }> {
    return agentOperationLayer.recommendProtocols(task);
  }
}