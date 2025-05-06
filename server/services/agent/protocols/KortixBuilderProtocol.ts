/**
 * Kortix/Suna.so Builder Protocol Implementation
 * 
 * Implements the Kortix/Suna.so Builder for visual agent-workflow design.
 * Focuses on no-code agent workflow creation.
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

// Workflow Node Types
enum NodeType {
  TRIGGER = 'trigger',
  CONDITION = 'condition',
  ACTION = 'action',
  LOOP = 'loop',
  PROCESSOR = 'processor',
  OUTPUT = 'output'
}

// Connection Types
enum ConnectionType {
  STANDARD = 'standard',
  SUCCESS = 'success',
  FAILURE = 'failure',
  CONDITION_TRUE = 'condition_true',
  CONDITION_FALSE = 'condition_false'
}

// Basic node interface
interface WorkflowNode {
  id: string;
  type: NodeType;
  name: string;
  description: string;
  config: Record<string, any>;
  position: { x: number; y: number };
}

// Connection between nodes
interface NodeConnection {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: ConnectionType;
  label?: string;
}

// Complete workflow definition
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: NodeConnection[];
  metadata: {
    version: string;
    creator: string;
    createdAt: string;
    tags: string[];
  };
}

// Execution state for a workflow
interface WorkflowExecutionState {
  workflowId: string;
  currentNodeId: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  variables: Record<string, any>;
  history: Array<{
    nodeId: string;
    timestamp: string;
    input?: any;
    output?: any;
    error?: string;
  }>;
  startTime: string;
  endTime?: string;
}

export class KortixBuilderProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are the Kortix/Suna.so Builder, a visual no-code agent workflow designer.
You excel at:
1. Translating natural language instructions into visual workflow diagrams
2. Designing efficient multi-step agent workflows
3. Implementing logic, conditions, and data transformations
4. Creating reusable workflow templates
5. Orchestrating complex processes with minimal coding`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.VISUAL_DESIGN,
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.TOOL_USE
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // Workflow state
  private workflowDefinition: WorkflowDefinition | null = null;
  private executionState: WorkflowExecutionState | null = null;
  private availableNodeTypes: Record<NodeType, string> = {
    [NodeType.TRIGGER]: 'Start a workflow based on an event',
    [NodeType.CONDITION]: 'Branch workflow based on a condition',
    [NodeType.ACTION]: 'Perform an action or call external service',
    [NodeType.LOOP]: 'Repeat a sequence of steps',
    [NodeType.PROCESSOR]: 'Transform or process data',
    [NodeType.OUTPUT]: 'Generate final output or response'
  };
  private workflowAnalysis: string = '';
  private previousWorkflowOutputs: Record<string, any>[] = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Kortix/Suna.so Builder',
      version: '1.0.0',
      description: 'Visual no-code agent workflow designer',
      capabilities: [
        ProtocolCapabilities.VISUAL_DESIGN,
        ProtocolCapabilities.MULTI_STEP,
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
    
    // Reset workflow state
    this.workflowDefinition = null;
    this.executionState = null;
    this.workflowAnalysis = '';
    this.previousWorkflowOutputs = [];
    
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
          name: 'Workflow Analysis',
          description: 'Analyzing requirements for workflow design',
          status: 'started'
        });
      }

      // Step 1: Analyze the task and identify workflow components
      await this.analyzeWorkflowRequirements(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Workflow Analysis',
          description: 'Workflow requirements analyzed',
          output: { analysis: this.workflowAnalysis.substring(0, 200) + '...' },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Workflow Design',
          description: 'Creating visual workflow diagram',
          status: 'started'
        });
      }

      // Step 2: Design the workflow diagram
      await this.designWorkflowDiagram(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Workflow Design',
          description: 'Workflow diagram created',
          output: { 
            nodes: this.workflowDefinition?.nodes.length,
            connections: this.workflowDefinition?.connections.length
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Workflow Execution',
          description: 'Executing workflow simulation',
          status: 'started'
        });
      }

      // Step 3: Simulate workflow execution
      await this.simulateWorkflowExecution(options.task, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Workflow Execution',
          description: 'Workflow simulation completed',
          output: { 
            status: this.executionState?.status,
            steps: this.executionState?.history.length
          },
          status: 'completed'
        });
      }
      
      // Prepare the final response
      const finalResponse = this.formatFinalResponse();
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalResponse,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'kortixbuilder',
        metadata: {
          workflowName: this.workflowDefinition?.name,
          workflowId: this.workflowDefinition?.id,
          nodeCount: this.workflowDefinition?.nodes.length,
          executionStatus: this.executionState?.status
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Kortix Builder Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Analyze workflow requirements from task description
   */
  private async analyzeWorkflowRequirements(task: string, options: ProtocolExecutionOptions): Promise<void> {
    const analysisPrompt = `As the Kortix/Suna.so Builder, analyze this workflow automation request and identify the key components needed:

Task: ${task}

Available Node Types:
${Object.entries(this.availableNodeTypes).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

Available Tools:
${this.availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Please provide a detailed analysis including:
1. The primary goal of this workflow
2. Key steps or stages needed
3. Required inputs and expected outputs
4. Decision points or conditions
5. Tools or services that should be incorporated
6. Data transformations needed
7. Potential edge cases or error handling needs

This analysis will guide the visual workflow design.`;

    // Get analysis from LLM
    const analysis = await this.getResponseFromLLM(analysisPrompt);
    
    // Store the analysis
    this.workflowAnalysis = analysis;
  }

  /**
   * Design the workflow diagram based on analysis
   */
  private async designWorkflowDiagram(options: ProtocolExecutionOptions): Promise<void> {
    const designPrompt = `As the Kortix/Suna.so Builder, create a visual workflow diagram based on this analysis:

${this.workflowAnalysis}

Design a complete workflow with appropriate nodes and connections. Include:

1. A unique ID for the workflow
2. A descriptive name for the workflow
3. A brief workflow description
4. A set of workflow nodes (each with id, type, name, description, configuration, and position)
5. Connections between nodes (specifying source, target, and connection type)
6. Appropriate metadata (version, creator, timestamp, tags)

Use these node types:
${Object.entries(this.availableNodeTypes).map(([type, desc]) => `- ${type}: ${desc}`).join('\n')}

Connection types:
- standard: Regular flow connection
- success: Used after successful operation
- failure: Used after failed operation
- condition_true: When condition evaluates to true
- condition_false: When condition evaluates to false

Respond with a JSON object representing the complete workflow definition.`;

    // Get workflow definition from LLM
    const designResponse = await this.getResponseFromLLM(designPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = designResponse.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        const workflowJson = JSON.parse(jsonMatch[0]);
        
        // Basic validation of workflow structure
        if (!workflowJson.id || !workflowJson.name || 
            !Array.isArray(workflowJson.nodes) || !Array.isArray(workflowJson.connections)) {
          throw new Error('Invalid workflow structure');
        }
        
        // Set current timestamp if not provided
        if (!workflowJson.metadata?.createdAt) {
          if (!workflowJson.metadata) {
            workflowJson.metadata = {};
          }
          workflowJson.metadata.createdAt = new Date().toISOString();
        }
        
        // Store the workflow definition
        this.workflowDefinition = workflowJson;
      } else {
        throw new Error('Could not extract workflow JSON');
      }
    } catch (error) {
      log(`Error parsing workflow definition: ${error}`, 'agent');
      
      // Create a basic workflow definition as fallback
      this.createFallbackWorkflow();
    }
  }

  /**
   * Create a basic fallback workflow when parsing fails
   */
  private createFallbackWorkflow(): void {
    const workflowId = `workflow-${Date.now()}`;
    
    // Create basic nodes
    const triggerNode: WorkflowNode = {
      id: `${workflowId}-trigger`,
      type: NodeType.TRIGGER,
      name: 'Start Workflow',
      description: 'Initiates the workflow',
      config: {},
      position: { x: 100, y: 100 }
    };
    
    const processorNode: WorkflowNode = {
      id: `${workflowId}-processor`,
      type: NodeType.PROCESSOR,
      name: 'Process Data',
      description: 'Process input data',
      config: {},
      position: { x: 300, y: 100 }
    };
    
    const outputNode: WorkflowNode = {
      id: `${workflowId}-output`,
      type: NodeType.OUTPUT,
      name: 'Generate Output',
      description: 'Produce final output',
      config: {},
      position: { x: 500, y: 100 }
    };
    
    // Create connections
    const connection1: NodeConnection = {
      id: `${workflowId}-conn1`,
      sourceNodeId: triggerNode.id,
      targetNodeId: processorNode.id,
      type: ConnectionType.STANDARD
    };
    
    const connection2: NodeConnection = {
      id: `${workflowId}-conn2`,
      sourceNodeId: processorNode.id,
      targetNodeId: outputNode.id,
      type: ConnectionType.STANDARD
    };
    
    // Create workflow definition
    this.workflowDefinition = {
      id: workflowId,
      name: 'Basic Workflow',
      description: 'A simple linear workflow with three steps',
      nodes: [triggerNode, processorNode, outputNode],
      connections: [connection1, connection2],
      metadata: {
        version: '1.0.0',
        creator: 'KortixBuilderProtocol',
        createdAt: new Date().toISOString(),
        tags: ['fallback', 'basic']
      }
    };
  }

  /**
   * Simulate workflow execution
   */
  private async simulateWorkflowExecution(task: string, options: ProtocolExecutionOptions): Promise<void> {
    if (!this.workflowDefinition) {
      throw new Error('No workflow definition available');
    }
    
    // Initialize execution state
    this.executionState = {
      workflowId: this.workflowDefinition.id,
      currentNodeId: this.findStartingNodeId(),
      status: 'running',
      variables: {
        input: task,
        // Add any other initial variables
      },
      history: [],
      startTime: new Date().toISOString()
    };
    
    // Maximum number of steps to prevent infinite loops
    const maxSteps = 20;
    let currentStep = 0;
    
    // Execute nodes until completion or max steps reached
    while (this.executionState.status === 'running' && currentStep < maxSteps) {
      currentStep++;
      
      // Execute current node
      await this.executeWorkflowNode(options);
      
      // Check for end conditions
      if (!this.executionState.currentNodeId || 
          this.isEndNode(this.executionState.currentNodeId)) {
        this.executionState.status = 'completed';
        this.executionState.endTime = new Date().toISOString();
      }
    }
    
    // If max steps reached but workflow not completed
    if (currentStep >= maxSteps && this.executionState.status !== 'completed') {
      this.executionState.status = 'failed';
      this.executionState.endTime = new Date().toISOString();
    }
  }

  /**
   * Execute a single workflow node
   */
  private async executeWorkflowNode(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.workflowDefinition || !this.executionState) {
      throw new Error('Workflow or execution state not initialized');
    }
    
    // Find current node
    const currentNode = this.workflowDefinition.nodes.find(
      node => node.id === this.executionState!.currentNodeId
    );
    
    if (!currentNode) {
      this.executionState.status = 'failed';
      return;
    }
    
    // Add node to execution history
    const historyEntry = {
      nodeId: currentNode.id,
      timestamp: new Date().toISOString(),
      input: this.getNodeInput(currentNode)
    };
    
    try {
      // Process node based on type
      let output: any;
      let nextNodeId: string | null = null;
      
      switch (currentNode.type) {
        case NodeType.TRIGGER:
          // Triggers just pass through
          output = historyEntry.input;
          nextNodeId = this.findNextNodeId(currentNode.id, ConnectionType.STANDARD);
          break;
          
        case NodeType.CONDITION:
          // Evaluate condition
          const conditionResult = await this.evaluateCondition(currentNode, historyEntry.input);
          output = { condition: currentNode.name, result: conditionResult };
          
          // Find next node based on condition result
          nextNodeId = this.findNextNodeId(
            currentNode.id, 
            conditionResult ? ConnectionType.CONDITION_TRUE : ConnectionType.CONDITION_FALSE
          );
          break;
          
        case NodeType.ACTION:
          // Execute action, possibly using tools
          output = await this.executeAction(currentNode, historyEntry.input, options);
          
          // Check if action was successful
          const actionSuccess = !output.error;
          nextNodeId = this.findNextNodeId(
            currentNode.id, 
            actionSuccess ? ConnectionType.SUCCESS : ConnectionType.FAILURE
          );
          break;
          
        case NodeType.PROCESSOR:
          // Process data
          output = await this.processData(currentNode, historyEntry.input);
          nextNodeId = this.findNextNodeId(currentNode.id, ConnectionType.STANDARD);
          break;
          
        case NodeType.LOOP:
          // Check loop condition
          const continueLoop = await this.evaluateLoopCondition(currentNode, historyEntry.input);
          output = { loop: currentNode.name, continue: continueLoop };
          
          // Find next node based on loop condition
          nextNodeId = this.findNextNodeId(
            currentNode.id, 
            continueLoop ? ConnectionType.CONDITION_TRUE : ConnectionType.CONDITION_FALSE
          );
          break;
          
        case NodeType.OUTPUT:
          // Generate output
          output = await this.generateOutput(currentNode, historyEntry.input);
          
          // Store in previous outputs for reference
          this.previousWorkflowOutputs.push(output);
          
          // Output nodes don't have next nodes
          nextNodeId = null;
          break;
          
        default:
          output = { error: `Unsupported node type: ${currentNode.type}` };
          nextNodeId = null;
      }
      
      // Update history entry with output
      historyEntry.output = output;
      
      // Set next node
      this.executionState.currentNodeId = nextNodeId || '';
    } catch (error) {
      // Handle execution error
      historyEntry.error = (error as Error).message;
      
      // Try to find failure path
      const failureNodeId = this.findNextNodeId(currentNode.id, ConnectionType.FAILURE);
      this.executionState.currentNodeId = failureNodeId || '';
      
      // If no failure path, mark workflow as failed
      if (!failureNodeId) {
        this.executionState.status = 'failed';
      }
    }
    
    // Add entry to history
    this.executionState.history.push(historyEntry);
  }

  /**
   * Find the starting node ID
   */
  private findStartingNodeId(): string {
    if (!this.workflowDefinition) {
      throw new Error('No workflow definition available');
    }
    
    // Look for a trigger node
    const triggerNode = this.workflowDefinition.nodes.find(node => node.type === NodeType.TRIGGER);
    
    if (triggerNode) {
      return triggerNode.id;
    }
    
    // Fallback to the first node
    if (this.workflowDefinition.nodes.length > 0) {
      return this.workflowDefinition.nodes[0].id;
    }
    
    throw new Error('No nodes in workflow definition');
  }

  /**
   * Check if a node is an end node
   */
  private isEndNode(nodeId: string): boolean {
    if (!this.workflowDefinition) {
      return true;
    }
    
    // A node is an end node if it has no outgoing connections
    return !this.workflowDefinition.connections.some(conn => conn.sourceNodeId === nodeId);
  }

  /**
   * Find the next node ID based on connection type
   */
  private findNextNodeId(sourceNodeId: string, connectionType: ConnectionType): string | null {
    if (!this.workflowDefinition) {
      return null;
    }
    
    // Find connection that matches source node and connection type
    const connection = this.workflowDefinition.connections.find(
      conn => conn.sourceNodeId === sourceNodeId && conn.type === connectionType
    );
    
    // If no matching connection found, look for standard connection as fallback
    if (!connection && connectionType !== ConnectionType.STANDARD) {
      const standardConnection = this.workflowDefinition.connections.find(
        conn => conn.sourceNodeId === sourceNodeId && conn.type === ConnectionType.STANDARD
      );
      
      return standardConnection ? standardConnection.targetNodeId : null;
    }
    
    return connection ? connection.targetNodeId : null;
  }

  /**
   * Get input for a node based on previous node outputs and variables
   */
  private getNodeInput(node: WorkflowNode): any {
    if (!this.executionState) {
      return {};
    }
    
    // Start with all variables
    const input = { ...this.executionState.variables };
    
    // Add previous node output if available
    if (this.executionState.history.length > 0) {
      const prevNode = this.executionState.history[this.executionState.history.length - 1];
      input.previousOutput = prevNode.output;
    }
    
    // Add node-specific configurations
    input.nodeConfig = node.config;
    
    return input;
  }

  /**
   * Evaluate a condition node
   */
  private async evaluateCondition(node: WorkflowNode, input: any): Promise<boolean> {
    if (!node.config.condition) {
      // Fallback to LLM evaluation if no explicit condition
      return this.evaluateConditionWithLLM(node, input);
    }
    
    try {
      // Simple condition evaluation based on variables
      // This is a simplified implementation
      const condition = node.config.condition;
      
      if (typeof condition === 'string') {
        // Handle string conditions (e.g., "input.value > 10")
        // This is very simplified - a real implementation would use a proper expression evaluator
        if (condition.includes('>')) {
          const [varPath, valueStr] = condition.split('>').map(s => s.trim());
          const varValue = this.getValueFromPath(input, varPath);
          const compareValue = Number(valueStr);
          return varValue > compareValue;
        } else if (condition.includes('<')) {
          const [varPath, valueStr] = condition.split('<').map(s => s.trim());
          const varValue = this.getValueFromPath(input, varPath);
          const compareValue = Number(valueStr);
          return varValue < compareValue;
        } else if (condition.includes('==')) {
          const [varPath, valueStr] = condition.split('==').map(s => s.trim());
          const varValue = this.getValueFromPath(input, varPath);
          return varValue == valueStr; // Intentional loose equality
        } else if (condition.includes('!=')) {
          const [varPath, valueStr] = condition.split('!=').map(s => s.trim());
          const varValue = this.getValueFromPath(input, varPath);
          return varValue != valueStr; // Intentional loose inequality
        }
      }
      
      // Fallback to LLM
      return this.evaluateConditionWithLLM(node, input);
    } catch (error) {
      log(`Error evaluating condition: ${error}`, 'agent');
      return false;
    }
  }

  /**
   * Evaluate a condition using LLM
   */
  private async evaluateConditionWithLLM(node: WorkflowNode, input: any): Promise<boolean> {
    const conditionPrompt = `Evaluate this condition in a workflow:

Condition: ${node.name}
Description: ${node.description}
Input: ${JSON.stringify(input, null, 2)}

Should this condition evaluate to true or false? Respond with only "true" or "false".`;

    const response = await this.getResponseFromLLM(conditionPrompt);
    return response.toLowerCase().includes('true');
  }

  /**
   * Execute an action node, possibly using tools
   */
  private async executeAction(
    node: WorkflowNode, 
    input: any,
    options: ProtocolExecutionOptions
  ): Promise<any> {
    // Check if the action is associated with a tool
    if (node.config.tool) {
      return this.executeActionWithTool(node, input, options);
    }
    
    // Otherwise, simulate action with LLM
    const actionPrompt = `Execute this action in a workflow:

Action: ${node.name}
Description: ${node.description}
Configuration: ${JSON.stringify(node.config, null, 2)}
Input: ${JSON.stringify(input, null, 2)}

Simulate the execution of this action and provide the expected output.
Respond with a JSON object representing the action result.`;

    const response = await this.getResponseFromLLM(actionPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return raw response
      return { result: response };
    } catch (error) {
      return { result: response };
    }
  }

  /**
   * Execute an action with a tool
   */
  private async executeActionWithTool(
    node: WorkflowNode,
    input: any,
    options: ProtocolExecutionOptions
  ): Promise<any> {
    const toolName = node.config.tool;
    
    // Find the tool
    const tool = this.availableTools.find(t => 
      t.name === toolName || 
      t.name.toLowerCase() === toolName.toLowerCase()
    );
    
    if (!tool) {
      return { error: `Tool not found: ${toolName}` };
    }
    
    // Prepare tool parameters
    let toolParams = node.config.params || {};
    
    // If tool params reference input variables, resolve them
    if (typeof toolParams === 'object') {
      toolParams = this.resolveVariableReferences(toolParams, input);
    }
    
    try {
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      const result = await tool.execute(toolParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolParams,
          output: result,
          error: undefined
        });
      }
      
      return { 
        tool: tool.name,
        params: toolParams,
        result 
      };
    } catch (error) {
      // Update the tool use callback with the error
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: tool.name,
          input: toolParams,
          output: undefined,
          error: (error as Error).message
        });
      }
      
      return { 
        tool: tool.name,
        params: toolParams,
        error: (error as Error).message 
      };
    }
  }

  /**
   * Process data in a processor node
   */
  private async processData(node: WorkflowNode, input: any): Promise<any> {
    // Check for pre-defined transformations
    if (node.config.transformation) {
      return this.applyTransformation(node.config.transformation, input);
    }
    
    // Otherwise, simulate processing with LLM
    const processorPrompt = `Process this data in a workflow:

Processor: ${node.name}
Description: ${node.description}
Configuration: ${JSON.stringify(node.config, null, 2)}
Input: ${JSON.stringify(input, null, 2)}

Transform this data according to the processor's description.
Respond with a JSON object representing the processed data.`;

    const response = await this.getResponseFromLLM(processorPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return raw response
      return { processed: response };
    } catch (error) {
      return { processed: response };
    }
  }

  /**
   * Apply a data transformation
   */
  private applyTransformation(transformation: string, input: any): any {
    // Simplified implementation - a real one would support more transformations
    const config = input.nodeConfig || {};
    
    switch (transformation) {
      case 'extract_fields':
        if (config.fields && Array.isArray(config.fields)) {
          const result: Record<string, any> = {};
          for (const field of config.fields) {
            result[field] = this.getValueFromPath(input, field);
          }
          return result;
        }
        break;
        
      case 'filter':
        if (config.condition) {
          // Apply filter condition to arrays
          if (input.items && Array.isArray(input.items)) {
            return {
              items: input.items.filter((item: any) => 
                this.evaluateFilterCondition(config.condition, item)
              )
            };
          }
        }
        break;
        
      case 'sort':
        if (config.sortBy && input.items && Array.isArray(input.items)) {
          const sortBy = config.sortBy;
          const sortDir = config.sortDirection || 'asc';
          
          return {
            items: [...input.items].sort((a: any, b: any) => {
              const aVal = this.getValueFromPath(a, sortBy);
              const bVal = this.getValueFromPath(b, sortBy);
              
              if (sortDir === 'asc') {
                return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
              } else {
                return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
              }
            })
          };
        }
        break;
        
      case 'aggregate':
        if (config.function && input.items && Array.isArray(input.items)) {
          const aggFunc = config.function;
          const field = config.field;
          
          if (field) {
            const values = input.items.map((item: any) => 
              this.getValueFromPath(item, field)
            ).filter((val: any) => typeof val === 'number');
            
            switch (aggFunc) {
              case 'sum':
                return { result: values.reduce((a: number, b: number) => a + b, 0) };
              case 'avg':
                return { result: values.reduce((a: number, b: number) => a + b, 0) / values.length };
              case 'min':
                return { result: Math.min(...values) };
              case 'max':
                return { result: Math.max(...values) };
              case 'count':
                return { result: values.length };
            }
          }
        }
        break;
    }
    
    // If no transformation was applied, return input unchanged
    return input;
  }

  /**
   * Evaluate loop condition
   */
  private async evaluateLoopCondition(node: WorkflowNode, input: any): Promise<boolean> {
    // Check if we have a max iterations config and counter
    if (node.config.maxIterations) {
      const currentIteration = input.loopCounter || 0;
      if (currentIteration >= node.config.maxIterations) {
        return false;
      }
    }
    
    // Check if we have an explicit condition
    if (node.config.condition) {
      return this.evaluateCondition({ ...node, config: { condition: node.config.condition } }, input);
    }
    
    // Use LLM to evaluate whether to continue looping
    const loopPrompt = `Evaluate this loop condition in a workflow:

Loop: ${node.name}
Description: ${node.description}
Configuration: ${JSON.stringify(node.config, null, 2)}
Current state: ${JSON.stringify(input, null, 2)}

Should this loop continue or exit? Respond with only "continue" or "exit".`;

    const response = await this.getResponseFromLLM(loopPrompt);
    return response.toLowerCase().includes('continue');
  }

  /**
   * Generate output from an output node
   */
  private async generateOutput(node: WorkflowNode, input: any): Promise<any> {
    // If the node has a specific output template, use it
    if (node.config.template) {
      return this.applyOutputTemplate(node.config.template, input);
    }
    
    // Otherwise, generate output with LLM
    const outputPrompt = `Generate the final output for this workflow:

Output Node: ${node.name}
Description: ${node.description}
Configuration: ${JSON.stringify(node.config, null, 2)}
Input State: ${JSON.stringify(input, null, 2)}
Execution History: ${JSON.stringify(this.executionState?.history.map(h => ({ 
  node: this.workflowDefinition?.nodes.find(n => n.id === h.nodeId)?.name,
  output: h.output
})), null, 2)}

Create a well-formatted, comprehensive output that fulfills the purpose of this workflow.
Respond with a JSON object containing the final output.`;

    const response = await this.getResponseFromLLM(outputPrompt);
    
    try {
      // Extract JSON from the response
      const jsonMatch = response.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON found, return raw response
      return { output: response };
    } catch (error) {
      return { output: response };
    }
  }

  /**
   * Apply an output template
   */
  private applyOutputTemplate(template: string, input: any): any {
    // Simple template replacement
    let result = template;
    
    // Find variable references like {{varName}}
    const varPattern = /{{([^}]+)}}/g;
    let match;
    
    while ((match = varPattern.exec(template)) !== null) {
      const varPath = match[1].trim();
      const varValue = this.getValueFromPath(input, varPath);
      
      // Replace in template
      result = result.replace(match[0], String(varValue !== undefined ? varValue : ''));
    }
    
    // Return as object
    return { output: result };
  }

  /**
   * Get a value from a nested path (e.g., "user.profile.name")
   */
  private getValueFromPath(obj: any, path: string): any {
    if (!obj || !path) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }

  /**
   * Resolve variable references in an object
   */
  private resolveVariableReferences(obj: Record<string, any>, context: any): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        // Extract path
        const path = value.slice(2, -2).trim();
        result[key] = this.getValueFromPath(context, path);
      } else if (typeof value === 'object' && value !== null) {
        // Recursively resolve nested objects
        result[key] = this.resolveVariableReferences(value, context);
      } else {
        // Keep value as is
        result[key] = value;
      }
    }
    
    return result;
  }

  /**
   * Evaluate a filter condition
   */
  private evaluateFilterCondition(condition: string, item: any): boolean {
    // Very simplified condition evaluation
    try {
      if (condition.includes('>')) {
        const [path, valueStr] = condition.split('>').map(s => s.trim());
        const itemValue = this.getValueFromPath(item, path);
        const compareValue = Number(valueStr);
        return itemValue > compareValue;
      } else if (condition.includes('<')) {
        const [path, valueStr] = condition.split('<').map(s => s.trim());
        const itemValue = this.getValueFromPath(item, path);
        const compareValue = Number(valueStr);
        return itemValue < compareValue;
      } else if (condition.includes('==')) {
        const [path, valueStr] = condition.split('==').map(s => s.trim());
        const itemValue = this.getValueFromPath(item, path);
        return String(itemValue) === valueStr;
      } else if (condition.includes('!=')) {
        const [path, valueStr] = condition.split('!=').map(s => s.trim());
        const itemValue = this.getValueFromPath(item, path);
        return String(itemValue) !== valueStr;
      } else if (condition.includes('contains')) {
        const [path, valueStr] = condition.split('contains').map(s => s.trim());
        const itemValue = String(this.getValueFromPath(item, path));
        return itemValue.includes(valueStr.replace(/['"]/g, ''));
      }
    } catch (error) {
      return false;
    }
    
    // Default to true if condition can't be parsed
    return true;
  }

  /**
   * Format the final response
   */
  private formatFinalResponse(): string {
    if (!this.workflowDefinition || !this.executionState) {
      return 'Error: Workflow execution incomplete';
    }
    
    let response = `# Kortix/Suna.so Workflow Design\n\n`;
    
    // Add workflow information
    response += `## Workflow: ${this.workflowDefinition.name}\n`;
    response += `${this.workflowDefinition.description}\n\n`;
    
    // Add workflow diagram (ASCII representation)
    response += `## Workflow Diagram\n`;
    response += this.generateAsciiDiagram();
    response += `\n\n`;
    
    // Add execution results
    response += `## Execution Results\n`;
    response += `Status: ${this.executionState.status}\n`;
    
    if (this.executionState.startTime && this.executionState.endTime) {
      const startTime = new Date(this.executionState.startTime);
      const endTime = new Date(this.executionState.endTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      response += `Duration: ${durationMs}ms\n`;
    }
    
    response += `Steps Executed: ${this.executionState.history.length}\n\n`;
    
    // Add execution path
    response += `### Execution Path\n`;
    for (const step of this.executionState.history) {
      const node = this.workflowDefinition.nodes.find(n => n.id === step.nodeId);
      if (node) {
        response += `1. **${node.name}** (${node.type})`;
        if (step.error) {
          response += ` - ❌ Error: ${step.error}`;
        } else {
          response += ` - ✅ Success`;
        }
        response += `\n`;
      }
    }
    
    // Add final output
    if (this.executionState.history.length > 0) {
      const lastStep = this.executionState.history[this.executionState.history.length - 1];
      if (lastStep.output) {
        response += `\n### Final Output\n`;
        response += '```json\n';
        response += JSON.stringify(lastStep.output, null, 2);
        response += '\n```\n';
      }
    }
    
    return response;
  }

  /**
   * Generate ASCII representation of workflow diagram
   */
  private generateAsciiDiagram(): string {
    if (!this.workflowDefinition) {
      return 'No workflow definition available';
    }
    
    let diagram = '```\n';
    
    // Group nodes by their vertical position (y coordinate)
    const nodesByRow = new Map<number, WorkflowNode[]>();
    
    for (const node of this.workflowDefinition.nodes) {
      const row = Math.round(node.position.y / 100);
      if (!nodesByRow.has(row)) {
        nodesByRow.set(row, []);
      }
      nodesByRow.get(row)!.push(node);
    }
    
    // Sort rows by y coordinate
    const sortedRows = Array.from(nodesByRow.entries())
      .sort(([rowA], [rowB]) => rowA - rowB);
    
    // Generate diagram row by row
    for (const [_, rowNodes] of sortedRows) {
      // Sort nodes in row by x coordinate
      rowNodes.sort((a, b) => a.position.x - b.position.x);
      
      // Node boxes
      let nodeRow = '';
      for (const node of rowNodes) {
        // Add spaces between nodes
        if (nodeRow.length > 0) {
          nodeRow += '     ';
        }
        
        // Create a box for the node
        nodeRow += `[${node.type.slice(0, 3).toUpperCase()}: ${node.name}]`;
      }
      diagram += nodeRow + '\n';
      
      // Connection lines
      let connRow = '';
      let hasConnections = false;
      
      for (let i = 0; i < rowNodes.length; i++) {
        const node = rowNodes[i];
        
        // Find outgoing connections
        const outConns = this.workflowDefinition.connections.filter(
          conn => conn.sourceNodeId === node.id
        );
        
        if (outConns.length > 0) {
          hasConnections = true;
          
          // Add spaces between nodes
          if (i > 0) {
            connRow += '     ';
          }
          
          // Place connection line in the middle of the node
          const nodeText = `[${node.type.slice(0, 3).toUpperCase()}: ${node.name}]`;
          const mid = Math.floor(nodeText.length / 2);
          
          connRow += ' '.repeat(mid) + '|' + ' '.repeat(nodeText.length - mid - 1);
        } else if (i > 0) {
          // No connections, just add spaces
          connRow += ' '.repeat(5);
        }
      }
      
      if (hasConnections) {
        diagram += connRow + '\n';
        
        // Add arrow heads
        let arrowRow = '';
        for (let i = 0; i < rowNodes.length; i++) {
          const node = rowNodes[i];
          
          // Find outgoing connections
          const outConns = this.workflowDefinition.connections.filter(
            conn => conn.sourceNodeId === node.id
          );
          
          if (outConns.length > 0) {
            // Add spaces between nodes
            if (i > 0) {
              arrowRow += '     ';
            }
            
            // Place arrow in the middle of the node
            const nodeText = `[${node.type.slice(0, 3).toUpperCase()}: ${node.name}]`;
            const mid = Math.floor(nodeText.length / 2);
            
            arrowRow += ' '.repeat(mid) + 'v' + ' '.repeat(nodeText.length - mid - 1);
          } else if (i > 0) {
            // No connections, just add spaces
            arrowRow += ' '.repeat(5);
          }
        }
        
        diagram += arrowRow + '\n';
      }
    }
    
    diagram += '```';
    return diagram;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // Extract tool calls from execution history
    const toolCalls: Array<{name: string, input: Record<string, any>, output: any}> = [];
    
    if (this.executionState?.history) {
      for (const step of this.executionState.history) {
        if (step.output?.tool && step.output?.params) {
          toolCalls.push({
            name: step.output.tool,
            input: step.output.params,
            output: step.output.error ? { error: step.output.error } : step.output.result
          });
        }
      }
    }
    
    return toolCalls.length > 0 ? toolCalls : undefined;
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
    // Reset workflow state
    this.workflowDefinition = null;
    this.executionState = null;
    this.workflowAnalysis = '';
    this.previousWorkflowOutputs = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}