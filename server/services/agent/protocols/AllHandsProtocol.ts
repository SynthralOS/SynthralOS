/**
 * All-Hands Protocol Implementation
 * 
 * Implements HuggingFace's All-Hands protocol for Dev multi-agent orchestration.
 * Focuses on repository/project flows with specialized dev agents.
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

// Dev agent roles
enum DevAgentRole {
  ARCHITECT = 'architect',
  DEVELOPER = 'developer',
  TESTER = 'tester',
  REVIEWER = 'reviewer',
  DOCUMENTER = 'documenter',
  SECURITY_EXPERT = 'security_expert',
  PRODUCT_MANAGER = 'product_manager'
}

// Agent definition
interface DevAgent {
  role: DevAgentRole;
  name: string;
  description: string;
  expertise: string[];
  systemPrompt: string;
}

// Project artifact
interface ProjectArtifact {
  name: string;
  type: 'code' | 'documentation' | 'test' | 'design' | 'plan' | 'review' | 'security';
  content: string;
  author: DevAgentRole;
  timestamp: string;
  status: 'draft' | 'review' | 'approved' | 'rejected';
  comments: Array<{
    role: DevAgentRole;
    comment: string;
    timestamp: string;
  }>;
}

// Task definition
interface Task {
  id: string;
  description: string;
  assignee: DevAgentRole;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dependsOn: string[];
  artifacts: string[];
}

export class AllHandsProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are All-Hands, a collaborative multi-agent orchestration protocol for software development projects.
You excel at:
1. Coordinating teams of specialized development agents
2. Managing software project lifecycles
3. Ensuring code quality and consistency
4. Efficient task allocation and execution
5. Comprehensive documentation and testing`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.COLLABORATION,
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.ROLE_PLAYING,
      ProtocolCapabilities.CODE_EXECUTION
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Project state
  private agents: DevAgent[] = [];
  private artifacts: ProjectArtifact[] = [];
  private tasks: Task[] = [];
  private projectContext: string = '';
  private currentPhase: 'planning' | 'development' | 'testing' | 'review' | 'documentation' = 'planning';
  private projectSummary: string = '';

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'All-Hands',
      version: '1.0.0',
      description: 'Dev multi-agent orchestration for repo/project flows (HuggingFace)',
      capabilities: [
        ProtocolCapabilities.COLLABORATION,
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.ROLE_PLAYING,
        ProtocolCapabilities.CODE_EXECUTION
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
    
    // Reset project state
    this.agents = [];
    this.artifacts = [];
    this.tasks = [];
    this.projectContext = '';
    this.currentPhase = 'planning';
    this.projectSummary = '';
    
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

      // Store the project context
      this.projectContext = options.task;

      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Team Assembly',
          description: 'Assembling development team with specialized roles',
          status: 'started'
        });
      }

      // Step 1: Initialize agents based on project needs
      await this.assembleDevTeam(options.task);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Team Assembly',
          description: 'Development team assembled',
          output: { agents: this.agents.map(a => a.name) },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Project Planning',
          description: 'Creating project plan and task breakdown',
          status: 'started'
        });
      }

      // Step 2: Planning phase - Create project plan
      await this.runPlanningPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Project Planning',
          description: 'Project plan created',
          output: { tasks: this.tasks.length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Development Phase',
          description: 'Implementing core functionality',
          status: 'started'
        });
      }

      // Step 3: Development phase - Implement core functionality
      this.currentPhase = 'development';
      await this.runDevelopmentPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Development Phase',
          description: 'Core implementation completed',
          output: { artifacts: this.getArtifactsByType('code').length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Testing Phase',
          description: 'Creating and running tests',
          status: 'started'
        });
      }

      // Step 4: Testing phase - Create and run tests
      this.currentPhase = 'testing';
      await this.runTestingPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Testing Phase',
          description: 'Testing completed',
          output: { artifacts: this.getArtifactsByType('test').length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Review Phase',
          description: 'Reviewing code and addressing issues',
          status: 'started'
        });
      }

      // Step 5: Review phase - Code review and improvements
      this.currentPhase = 'review';
      await this.runReviewPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Review Phase',
          description: 'Review process completed',
          output: { artifacts: this.getArtifactsByType('review').length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Documentation Phase',
          description: 'Creating documentation',
          status: 'started'
        });
      }

      // Step 6: Documentation phase - Create documentation
      this.currentPhase = 'documentation';
      await this.runDocumentationPhase(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Documentation Phase',
          description: 'Documentation completed',
          output: { artifacts: this.getArtifactsByType('documentation').length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Project Summary',
          description: 'Generating final project summary',
          status: 'started'
        });
      }

      // Step 7: Generate final project summary
      await this.generateProjectSummary(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Project Summary',
          description: 'Project summary generated',
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.projectSummary;
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'allhands',
        metadata: {
          agents: this.agents.map(a => a.role),
          artifacts: this.artifacts.length,
          tasks: this.tasks.length
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`All-Hands Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Assemble the development team based on project needs
   */
  private async assembleDevTeam(projectDescription: string): Promise<void> {
    // Core roles - always included
    this.agents.push(
      this.createAgent(DevAgentRole.ARCHITECT),
      this.createAgent(DevAgentRole.DEVELOPER),
      this.createAgent(DevAgentRole.TESTER)
    );
    
    // Determine if we need a security expert
    if (this.needsSecurityExpert(projectDescription)) {
      this.agents.push(this.createAgent(DevAgentRole.SECURITY_EXPERT));
    }
    
    // Always include reviewer and documenter for quality
    this.agents.push(
      this.createAgent(DevAgentRole.REVIEWER),
      this.createAgent(DevAgentRole.DOCUMENTER)
    );
    
    // Include product manager for larger projects
    if (this.isLargeProject(projectDescription)) {
      this.agents.push(this.createAgent(DevAgentRole.PRODUCT_MANAGER));
    }
  }

  /**
   * Create an agent with the specified role
   */
  private createAgent(role: DevAgentRole): DevAgent {
    switch (role) {
      case DevAgentRole.ARCHITECT:
        return {
          role,
          name: 'Software Architect',
          description: 'Designs the overall system architecture and makes key technical decisions',
          expertise: ['System design', 'Architecture patterns', 'Technical leadership', 'Code structure'],
          systemPrompt: `You are a Software Architect responsible for designing the overall system architecture.
Your focus is on:
- Creating clean, maintainable, and scalable architecture
- Making key technical decisions about frameworks, patterns, and approaches
- Ensuring the design meets all functional and non-functional requirements
- Providing architectural guidance to the development team`
        };
      
      case DevAgentRole.DEVELOPER:
        return {
          role,
          name: 'Developer',
          description: 'Implements the core functionality according to architectural guidelines',
          expertise: ['Programming', 'Algorithm implementation', 'Problem-solving', 'Debugging'],
          systemPrompt: `You are a Developer responsible for implementing the core functionality.
Your focus is on:
- Writing clean, efficient, and well-tested code
- Following architectural guidelines and coding standards
- Implementing features according to specifications
- Debugging and fixing issues as they arise`
        };
      
      case DevAgentRole.TESTER:
        return {
          role,
          name: 'Quality Assurance Engineer',
          description: 'Creates and runs tests to ensure code quality and functionality',
          expertise: ['Test design', 'Test automation', 'Quality assurance', 'Bug reporting'],
          systemPrompt: `You are a Quality Assurance Engineer responsible for testing.
Your focus is on:
- Creating comprehensive test plans and test cases
- Writing automated tests (unit, integration, and system)
- Identifying edge cases and potential issues
- Ensuring the software meets quality standards and requirements`
        };
      
      case DevAgentRole.REVIEWER:
        return {
          role,
          name: 'Code Reviewer',
          description: 'Reviews code for quality, standards, and potential issues',
          expertise: ['Code review', 'Best practices', 'Static analysis', 'Code quality'],
          systemPrompt: `You are a Code Reviewer responsible for ensuring code quality.
Your focus is on:
- Reviewing code for readability, maintainability, and efficiency
- Ensuring adherence to coding standards and best practices
- Identifying potential bugs, edge cases, or performance issues
- Providing constructive feedback to improve code quality`
        };
      
      case DevAgentRole.DOCUMENTER:
        return {
          role,
          name: 'Technical Writer',
          description: 'Creates documentation for the project, code, and APIs',
          expertise: ['Technical writing', 'Documentation', 'API documentation', 'User guides'],
          systemPrompt: `You are a Technical Writer responsible for creating documentation.
Your focus is on:
- Writing clear and concise technical documentation
- Creating user guides, API documentation, and code comments
- Making complex technical concepts accessible
- Ensuring documentation is complete, accurate, and up-to-date`
        };
      
      case DevAgentRole.SECURITY_EXPERT:
        return {
          role,
          name: 'Security Expert',
          description: 'Reviews code and architecture for security vulnerabilities',
          expertise: ['Security analysis', 'Threat modeling', 'Secure coding', 'Vulnerability assessment'],
          systemPrompt: `You are a Security Expert responsible for ensuring the security of the software.
Your focus is on:
- Identifying potential security vulnerabilities
- Conducting threat modeling and security reviews
- Recommending secure coding practices
- Ensuring compliance with security standards and best practices`
        };
      
      case DevAgentRole.PRODUCT_MANAGER:
        return {
          role,
          name: 'Product Manager',
          description: 'Ensures the project meets business and user requirements',
          expertise: ['Requirements gathering', 'User stories', 'Feature prioritization', 'Product roadmap'],
          systemPrompt: `You are a Product Manager responsible for ensuring the project meets requirements.
Your focus is on:
- Clarifying business and user requirements
- Creating and managing user stories and acceptance criteria
- Prioritizing features and tasks
- Ensuring the final product delivers value to users`
        };
      
      default:
        throw new Error(`Unknown agent role: ${role}`);
    }
  }

  /**
   * Check if the project needs a security expert
   */
  private needsSecurityExpert(projectDescription: string): boolean {
    const securityKeywords = [
      'security', 'authentication', 'authorization', 'encryption',
      'user data', 'privacy', 'sensitive', 'login', 'password',
      'access control', 'oauth', 'jwt', 'tokens', 'secure'
    ];
    
    return securityKeywords.some(keyword => 
      projectDescription.toLowerCase().includes(keyword)
    );
  }

  /**
   * Check if the project is large and complex
   */
  private isLargeProject(projectDescription: string): boolean {
    // Check project size based on description length and complexity
    const isLongDescription = projectDescription.length > 500;
    
    const complexityKeywords = [
      'complex', 'large', 'multiple', 'several', 'integration',
      'enterprise', 'scalable', 'extensive', 'comprehensive',
      'multi-part', 'many features', 'sophisticated'
    ];
    
    const hasComplexityKeywords = complexityKeywords.some(keyword => 
      projectDescription.toLowerCase().includes(keyword)
    );
    
    return isLongDescription || hasComplexityKeywords;
  }

  /**
   * Run the planning phase
   */
  private async runPlanningPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get the architect agent
    const architect = this.getAgentByRole(DevAgentRole.ARCHITECT);
    if (!architect) {
      throw new Error('Architect agent not found');
    }
    
    // 1. Create architectural design
    const architecturalDesign = await this.generateArtifactFromAgent(
      architect,
      'architecture_design',
      'design',
      `Create a high-level architectural design for this project:
      
${this.projectContext}

Include:
1. Overall system architecture
2. Key components and their relationships
3. Technical decisions (languages, frameworks, patterns)
4. Data models and storage approach
5. Any API specifications

The design should be comprehensive but concise.`,
      options
    );
    
    // 2. Get product manager to create requirements (if available)
    let requirementsArtifact: ProjectArtifact | null = null;
    const productManager = this.getAgentByRole(DevAgentRole.PRODUCT_MANAGER);
    
    if (productManager) {
      requirementsArtifact = await this.generateArtifactFromAgent(
        productManager,
        'project_requirements',
        'documentation',
        `Based on this project description:
        
${this.projectContext}

And this architectural design:

${architecturalDesign.content}

Create detailed project requirements including:
1. User stories or functional requirements
2. Non-functional requirements
3. Acceptance criteria
4. Project scope and constraints
5. Key deliverables

Be detailed but concise.`,
        options
      );
    }
    
    // 3. Create task breakdown
    const taskBreakdownInput = `Create a detailed task breakdown for this project:
    
Project Description:
${this.projectContext}

Architectural Design:
${architecturalDesign.content}

${requirementsArtifact ? `
Requirements:
${requirementsArtifact.content}
` : ''}

Provide a structured list of tasks with:
1. Task description
2. Appropriate assignee role (architect, developer, tester, etc.)
3. Dependencies between tasks
4. Estimated complexity (simple, medium, complex)

Tasks should cover all phases: design, development, testing, review, and documentation.`;
    
    // Use architect or product manager for task breakdown
    const taskPlannerAgent = productManager || architect;
    const taskBreakdownArtifact = await this.generateArtifactFromAgent(
      taskPlannerAgent,
      'task_breakdown',
      'plan',
      taskBreakdownInput,
      options
    );
    
    // 4. Parse tasks from the breakdown
    this.tasks = this.parseTasks(taskBreakdownArtifact.content);
  }

  /**
   * Parse tasks from task breakdown artifact
   */
  private parseTasks(taskBreakdown: string): Task[] {
    const tasks: Task[] = [];
    const taskPattern = /(\d+|\*)\.\s+(.+?)(?=\n\d+\.|\n\*|\n\n|$)/gs;
    let match;
    let taskId = 1;
    
    while ((match = taskPattern.exec(taskBreakdown)) !== null) {
      const taskDescription = match[2].trim();
      
      // Extract assignee
      let assignee = DevAgentRole.DEVELOPER; // Default assignee
      const assigneeMatch = taskDescription.match(/assignee:?\s+(\w+)/i) || 
                            taskDescription.match(/role:?\s+(\w+)/i);
      
      if (assigneeMatch) {
        const roleName = assigneeMatch[1].toLowerCase();
        // Map the role name to DevAgentRole
        if (roleName.includes('architect')) {
          assignee = DevAgentRole.ARCHITECT;
        } else if (roleName.includes('develop') || roleName.includes('implement')) {
          assignee = DevAgentRole.DEVELOPER;
        } else if (roleName.includes('test')) {
          assignee = DevAgentRole.TESTER;
        } else if (roleName.includes('review')) {
          assignee = DevAgentRole.REVIEWER;
        } else if (roleName.includes('document')) {
          assignee = DevAgentRole.DOCUMENTER;
        } else if (roleName.includes('security')) {
          assignee = DevAgentRole.SECURITY_EXPERT;
        } else if (roleName.includes('product') || roleName.includes('manager')) {
          assignee = DevAgentRole.PRODUCT_MANAGER;
        }
      }
      
      // Extract dependencies
      const dependsOn: string[] = [];
      const dependsMatch = taskDescription.match(/depends on:?\s+(.+?)(?=\n|$)/i);
      if (dependsMatch) {
        const dependencies = dependsMatch[1].split(',').map(d => d.trim());
        dependencies.forEach(dep => {
          const depId = dep.match(/(\d+)/);
          if (depId) {
            dependsOn.push(`task${depId[1]}`);
          }
        });
      }
      
      tasks.push({
        id: `task${taskId}`,
        description: taskDescription.replace(/assignee:?\s+\w+/i, '').replace(/depends on:?\s+.+?(?=\n|$)/i, '').trim(),
        assignee,
        status: 'pending',
        dependsOn,
        artifacts: []
      });
      
      taskId++;
    }
    
    return tasks;
  }

  /**
   * Run the development phase
   */
  private async runDevelopmentPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get developer agent
    const developer = this.getAgentByRole(DevAgentRole.DEVELOPER);
    if (!developer) {
      throw new Error('Developer agent not found');
    }
    
    // Get architecture design artifact
    const architectureDesign = this.artifacts.find(a => a.name === 'architecture_design');
    if (!architectureDesign) {
      throw new Error('Architecture design artifact not found');
    }
    
    // Get all developer tasks
    const developerTasks = this.tasks.filter(task => 
      task.assignee === DevAgentRole.DEVELOPER && task.status === 'pending'
    );
    
    // Track task dependencies to ensure correct order
    const completedTaskIds: string[] = [];
    
    // Process developer tasks
    for (const task of developerTasks) {
      // Check if dependencies are satisfied
      const unsatisfiedDependencies = task.dependsOn.filter(depId => !completedTaskIds.includes(depId));
      if (unsatisfiedDependencies.length > 0) {
        continue; // Skip tasks with unsatisfied dependencies
      }
      
      // Update task status
      task.status = 'in_progress';
      
      // Get task description
      const taskDescription = `Implement the following task:
      
${task.description}

Based on the architectural design:

${architectureDesign.content}

Write the necessary code to implement this functionality. Include:
1. Well-structured code with appropriate comments
2. Error handling and edge cases
3. Explanations of key implementation decisions

Focus on quality, readability, and adherence to architectural guidelines.`;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Development Task: ${task.id}`,
          description: task.description,
          status: 'started'
        });
      }
      
      // Generate code artifact for the task
      const codeArtifact = await this.generateArtifactFromAgent(
        developer,
        `code_${task.id}`,
        'code',
        taskDescription,
        options
      );
      
      // Link task to artifact
      task.artifacts.push(codeArtifact.name);
      
      // Update task status
      task.status = 'completed';
      completedTaskIds.push(task.id);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Development Task: ${task.id}`,
          description: task.description,
          status: 'completed'
        });
      }
    }
    
    // Handle security review if needed
    const securityExpert = this.getAgentByRole(DevAgentRole.SECURITY_EXPERT);
    if (securityExpert) {
      const codeArtifacts = this.getArtifactsByType('code');
      const securityReviewInput = `Perform a security review on the following code artifacts:
      
${codeArtifacts.map(a => `${a.name}:\n${a.content}\n\n`).join('')}

Identify any security issues or vulnerabilities, including:
1. Input validation issues
2. Authentication/authorization weaknesses
3. Data protection concerns
4. General security best practices not being followed

Provide specific recommendations for addressing each issue.`;
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Security Review',
          description: 'Performing security analysis of code artifacts',
          status: 'started'
        });
      }
      
      // Generate security review artifact
      const securityReview = await this.generateArtifactFromAgent(
        securityExpert,
        'security_review',
        'security',
        securityReviewInput,
        options
      );
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Security Review',
          description: 'Security analysis completed',
          status: 'completed'
        });
      }
      
      // Address security issues
      if (securityReview.content.toLowerCase().includes('issue') || 
          securityReview.content.toLowerCase().includes('vulnerabilit')) {
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: 'Security Fixes',
            description: 'Addressing security issues identified in review',
            status: 'started'
          });
        }
        
        // Update each code artifact with security fixes
        for (const codeArtifact of codeArtifacts) {
          const securityFixInput = `Fix the security issues identified in this code:
          
${codeArtifact.content}

According to this security review:

${securityReview.content}

Update the code to address all security concerns while maintaining functionality.`;
          
          // Generate updated code with security fixes
          const updatedCodeArtifact = await this.generateArtifactFromAgent(
            developer,
            `${codeArtifact.name}_secure`,
            'code',
            securityFixInput,
            options
          );
          
          // Update the original artifact with secure version
          codeArtifact.content = updatedCodeArtifact.content;
          codeArtifact.comments.push({
            role: securityExpert.role,
            comment: 'Updated with security fixes',
            timestamp: new Date().toISOString()
          });
        }
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: 'Security Fixes',
            description: 'Security issues addressed in code',
            status: 'completed'
          });
        }
      }
    }
  }

  /**
   * Run the testing phase
   */
  private async runTestingPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get tester agent
    const tester = this.getAgentByRole(DevAgentRole.TESTER);
    if (!tester) {
      throw new Error('Tester agent not found');
    }
    
    // Get code artifacts to test
    const codeArtifacts = this.getArtifactsByType('code');
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Test Plan Creation',
        description: 'Creating comprehensive test plan',
        status: 'started'
      });
    }
    
    // 1. Create test plan
    const testPlanInput = `Create a comprehensive test plan for the following code:
    
${codeArtifacts.map(a => `${a.name}:\n${a.content}\n\n`).join('')}

Include:
1. Test strategy and approach
2. Types of tests to implement (unit, integration, etc.)
3. Test coverage goals
4. Key test scenarios and cases
5. Any specific test frameworks or tools to use

The test plan should be thorough but realistic.`;
    
    const testPlan = await this.generateArtifactFromAgent(
      tester,
      'test_plan',
      'test',
      testPlanInput,
      options
    );
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Test Plan Creation',
        description: 'Test plan created',
        status: 'completed'
      });
    }
    
    // 2. Create test implementations
    for (const codeArtifact of codeArtifacts) {
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Test Implementation: ${codeArtifact.name}`,
          description: `Creating tests for ${codeArtifact.name}`,
          status: 'started'
        });
      }
      
      const testImplementationInput = `Create tests for the following code:
      
${codeArtifact.content}

Based on this test plan:
${testPlan.content}

Implement comprehensive tests that:
1. Verify correct functionality
2. Test edge cases and error conditions
3. Achieve good code coverage
4. Are readable and maintainable

Use appropriate testing frameworks and patterns.`;
      
      // Generate test artifact
      const testArtifact = await this.generateArtifactFromAgent(
        tester,
        `tests_for_${codeArtifact.name}`,
        'test',
        testImplementationInput,
        options
      );
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Test Implementation: ${codeArtifact.name}`,
          description: `Tests created for ${codeArtifact.name}`,
          status: 'completed'
        });
      }
      
      // 3. Execute tests (simulate test execution)
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Test Execution: ${testArtifact.name}`,
          description: `Running tests for ${codeArtifact.name}`,
          status: 'started'
        });
      }
      
      const testExecutionInput = `Review these tests and simulate their execution:
      
${testArtifact.content}

For the following code:
${codeArtifact.content}

Provide the test results including:
1. Which tests passed or failed
2. Any issues or bugs discovered
3. Test coverage analysis
4. Recommendations for code improvements based on test results

Be thorough and realistic in your assessment.`;
      
      // Generate test results artifact
      const testResults = await this.generateArtifactFromAgent(
        tester,
        `test_results_for_${codeArtifact.name}`,
        'test',
        testExecutionInput,
        options
      );
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Test Execution: ${testArtifact.name}`,
          description: `Tests executed for ${codeArtifact.name}`,
          status: 'completed'
        });
      }
      
      // 4. Fix any issues discovered in testing
      if (testResults.content.toLowerCase().includes('fail') || 
          testResults.content.toLowerCase().includes('issue') || 
          testResults.content.toLowerCase().includes('bug')) {
        
        // Get developer agent to fix issues
        const developer = this.getAgentByRole(DevAgentRole.DEVELOPER);
        if (!developer) {
          throw new Error('Developer agent not found');
        }
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Bug Fixing: ${codeArtifact.name}`,
            description: `Fixing issues discovered in testing`,
            status: 'started'
          });
        }
        
        const bugFixInput = `Fix the issues discovered during testing:
        
Code:
${codeArtifact.content}

Test Results:
${testResults.content}

Update the code to fix all issues while ensuring it still meets requirements.
Explain the changes you're making and why they address the problems.`;
        
        // Generate updated code with fixes
        const fixedCodeArtifact = await this.generateArtifactFromAgent(
          developer,
          `${codeArtifact.name}_fixed`,
          'code',
          bugFixInput,
          options
        );
        
        // Update the original artifact with fixed version
        codeArtifact.content = fixedCodeArtifact.content;
        codeArtifact.comments.push({
          role: developer.role,
          comment: 'Fixed issues discovered in testing',
          timestamp: new Date().toISOString()
        });
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Bug Fixing: ${codeArtifact.name}`,
            description: `Issues fixed in ${codeArtifact.name}`,
            status: 'completed'
          });
        }
      }
    }
  }

  /**
   * Run the review phase
   */
  private async runReviewPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get reviewer agent
    const reviewer = this.getAgentByRole(DevAgentRole.REVIEWER);
    if (!reviewer) {
      throw new Error('Reviewer agent not found');
    }
    
    // Get code artifacts to review
    const codeArtifacts = this.getArtifactsByType('code');
    
    // Review each code artifact
    for (const codeArtifact of codeArtifacts) {
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Code Review: ${codeArtifact.name}`,
          description: `Reviewing ${codeArtifact.name}`,
          status: 'started'
        });
      }
      
      const reviewInput = `Review the following code:
      
${codeArtifact.content}

Evaluate the code for:
1. Code quality and readability
2. Adherence to best practices
3. Performance considerations
4. Potential bugs or edge cases
5. Overall design and structure

Provide constructive feedback and specific recommendations for improvement.`;
      
      // Generate review artifact
      const reviewArtifact = await this.generateArtifactFromAgent(
        reviewer,
        `review_for_${codeArtifact.name}`,
        'review',
        reviewInput,
        options
      );
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Code Review: ${codeArtifact.name}`,
          description: `Review completed for ${codeArtifact.name}`,
          status: 'completed'
        });
      }
      
      // Add review comments to the code artifact
      codeArtifact.comments.push({
        role: reviewer.role,
        comment: `Review comments: ${reviewArtifact.content.slice(0, 100)}...`,
        timestamp: new Date().toISOString()
      });
      
      // Address review feedback if significant issues found
      if (reviewArtifact.content.toLowerCase().includes('should') || 
          reviewArtifact.content.toLowerCase().includes('improve') || 
          reviewArtifact.content.toLowerCase().includes('fix')) {
        
        // Get developer agent to address review comments
        const developer = this.getAgentByRole(DevAgentRole.DEVELOPER);
        if (!developer) {
          throw new Error('Developer agent not found');
        }
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Review Fixes: ${codeArtifact.name}`,
            description: `Addressing review feedback for ${codeArtifact.name}`,
            status: 'started'
          });
        }
        
        const reviewFixInput = `Address the review feedback for this code:
        
Code:
${codeArtifact.content}

Review Feedback:
${reviewArtifact.content}

Update the code to address the reviewer's comments and improve quality.
Explain the changes you're making and how they address the feedback.`;
        
        // Generate updated code with review fixes
        const revisedCodeArtifact = await this.generateArtifactFromAgent(
          developer,
          `${codeArtifact.name}_revised`,
          'code',
          reviewFixInput,
          options
        );
        
        // Update the original artifact with revised version
        codeArtifact.content = revisedCodeArtifact.content;
        codeArtifact.comments.push({
          role: developer.role,
          comment: 'Updated based on review feedback',
          timestamp: new Date().toISOString()
        });
        
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Review Fixes: ${codeArtifact.name}`,
            description: `Review feedback addressed for ${codeArtifact.name}`,
            status: 'completed'
          });
        }
      }
    }
  }

  /**
   * Run the documentation phase
   */
  private async runDocumentationPhase(options: ProtocolExecutionOptions): Promise<void> {
    // Get documenter agent
    const documenter = this.getAgentByRole(DevAgentRole.DOCUMENTER);
    if (!documenter) {
      throw new Error('Documenter agent not found');
    }
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'API Documentation',
        description: 'Creating API and code documentation',
        status: 'started'
      });
    }
    
    // 1. Create API/Code documentation
    const codeArtifacts = this.getArtifactsByType('code');
    const apiDocInput = `Create comprehensive API and code documentation for:
    
${codeArtifacts.map(a => `${a.name}:\n${a.content}\n\n`).join('')}

Include:
1. Overview of each component/module
2. Function/method documentation with parameters and return values
3. Usage examples
4. Data structures and types
5. Any important implementation notes

The documentation should be clear, concise, and helpful for developers.`;
    
    const apiDocumentation = await this.generateArtifactFromAgent(
      documenter,
      'api_documentation',
      'documentation',
      apiDocInput,
      options
    );
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'API Documentation',
        description: 'API documentation created',
        status: 'completed'
      });
    }
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'User Documentation',
        description: 'Creating user/installation documentation',
        status: 'started'
      });
    }
    
    // 2. Create user/readme documentation
    const userDocInput = `Create user and installation documentation for this project:
    
Project Overview:
${this.projectContext}

Include:
1. Project overview and purpose
2. Installation instructions
3. Configuration options
4. Basic usage examples
5. Troubleshooting tips

Format this as a comprehensive README that would help users understand and use the project.`;
    
    const userDocumentation = await this.generateArtifactFromAgent(
      documenter,
      'user_documentation',
      'documentation',
      userDocInput,
      options
    );
    
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'User Documentation',
        description: 'User documentation created',
        status: 'completed'
      });
    }
  }

  /**
   * Generate a project summary
   */
  private async generateProjectSummary(options: ProtocolExecutionOptions): Promise<void> {
    // Determine which agent should create the summary
    let summaryAgent: DevAgent;
    const productManager = this.getAgentByRole(DevAgentRole.PRODUCT_MANAGER);
    const architect = this.getAgentByRole(DevAgentRole.ARCHITECT);
    
    // Prefer product manager for summary if available, otherwise architect
    summaryAgent = productManager || architect!;
    
    const summaryInput = `Create a comprehensive project summary for:
    
Project Overview:
${this.projectContext}

Key Artifacts:
${this.artifacts.map(a => `- ${a.name} (${a.type}): ${a.content.slice(0, 100)}...`).join('\n')}

Include:
1. Executive summary of the project
2. Key features implemented
3. Technical architecture overview
4. Quality assurance measures
5. Future work or recommendations

This should serve as a complete overview of the project deliverables and process.`;
    
    // Generate the project summary
    const summaryArtifact = await this.generateArtifactFromAgent(
      summaryAgent,
      'project_summary',
      'documentation',
      summaryInput,
      options
    );
    
    // Store the project summary
    this.projectSummary = summaryArtifact.content;
  }

  /**
   * Generate an artifact from an agent
   */
  private async generateArtifactFromAgent(
    agent: DevAgent,
    name: string,
    type: ProjectArtifact['type'],
    input: string,
    options: ProtocolExecutionOptions
  ): Promise<ProjectArtifact> {
    // Generate content from the agent
    const content = await this.getAgentResponse(agent, input);
    
    // Create the artifact
    const artifact: ProjectArtifact = {
      name,
      type,
      content,
      author: agent.role,
      timestamp: new Date().toISOString(),
      status: 'approved',
      comments: []
    };
    
    // Add to artifacts collection
    this.artifacts.push(artifact);
    
    return artifact;
  }

  /**
   * Get a response from an agent
   */
  private async getAgentResponse(agent: DevAgent, prompt: string): Promise<string> {
    // Create the full agent prompt
    const fullPrompt = `${agent.systemPrompt}\n\n${prompt}`;
    
    // Get response from the LLM
    return await this.getResponseFromLLM(fullPrompt);
  }

  /**
   * Get an agent by role
   */
  private getAgentByRole(role: DevAgentRole): DevAgent | undefined {
    return this.agents.find(a => a.role === role);
  }

  /**
   * Get artifacts by type
   */
  private getArtifactsByType(type: ProjectArtifact['type']): ProjectArtifact[] {
    return this.artifacts.filter(a => a.type === type);
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // If tools were used during the process, return their history
    // For this implementation, we're returning undefined as tools aren't directly used
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
    // Reset project state
    this.agents = [];
    this.artifacts = [];
    this.tasks = [];
    this.projectContext = '';
    this.currentPhase = 'planning';
    this.projectSummary = '';
    this.initialized = false;
    
    return Promise.resolve();
  }
}