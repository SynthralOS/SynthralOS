import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from '@shared/schema';
import webSocketHandler, { WebSocketEvent } from './WebSocketHandler';

/**
 * Enum for execution status
 */
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  STOPPED = 'stopped'
}

/**
 * Enum for node status
 */
export enum NodeStatus {
  IDLE = 'idle',
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Result of a node execution
 */
interface NodeResult {
  nodeId: string;
  status: NodeStatus;
  output?: any;
  error?: string;
  executionTime?: number;
  startTime?: Date;
  endTime?: Date;
}

/**
 * Execution context for a workflow
 */
interface ExecutionContext {
  executionId: string;
  workflowId: number;
  status: ExecutionStatus;
  variables: Record<string, any>;
  nodeResults: Record<string, NodeResult>;
  startTime: Date;
  endTime?: Date;
  lastError?: string;
  currentNodeId?: string;
}

/**
 * Service for executing workflows
 */
class WorkflowService {
  // Store active executions in memory
  private activeExecutions: Map<string, ExecutionContext> = new Map();
  
  // Store execution history for each workflow
  private executionHistory: Map<number, string[]> = new Map();
  
  /**
   * Execute a workflow
   * @param workflowId - ID of the workflow to execute
   * @param workflowData - Workflow definition with nodes and edges
   * @param variables - Initial variables for the workflow
   * @returns Execution ID
   */
  async executeWorkflow(
    workflowId: number,
    workflowData: { nodes: Node[], edges: Edge[] },
    variables: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Validate workflow
      if (!workflowData || !workflowData.nodes || !workflowData.edges) {
        throw new Error('Invalid workflow data');
      }
      
      // Generate execution ID
      const executionId = uuidv4();
      
      // Create execution context
      const context: ExecutionContext = {
        executionId,
        workflowId,
        status: ExecutionStatus.PENDING,
        variables,
        nodeResults: {},
        startTime: new Date()
      };
      
      // Store execution context
      this.activeExecutions.set(executionId, context);
      
      // Add to execution history
      if (!this.executionHistory.has(workflowId)) {
        this.executionHistory.set(workflowId, []);
      }
      
      this.executionHistory.get(workflowId)?.push(executionId);
      
      // Execute workflow in background
      this.runWorkflow(executionId, workflowData).catch(error => {
        console.error(`Execution ${executionId} failed:`, error);
        
        // Update execution context
        const context = this.activeExecutions.get(executionId);
        
        if (context) {
          context.status = ExecutionStatus.FAILED;
          context.lastError = error.message;
          context.endTime = new Date();
          
          // Send execution update
          this.sendExecutionUpdate(executionId, {
            status: context.status,
            error: context.lastError
          });
        }
      });
      
      return executionId;
    } catch (error: any) {
      console.error('Failed to start workflow execution:', error);
      throw error;
    }
  }
  
  /**
   * Get all active executions
   * @returns Set of active execution IDs
   */
  getActiveExecutions(): Set<string> {
    return new Set(this.activeExecutions.keys());
  }
  
  /**
   * Get execution context
   * @param executionId - ID of the execution
   * @returns Execution context
   */
  getExecutionContext(executionId: string): ExecutionContext | undefined {
    return this.activeExecutions.get(executionId);
  }
  
  /**
   * Get execution history for a workflow
   * @param workflowId - ID of the workflow
   * @returns Array of execution IDs
   */
  getExecutionHistory(workflowId: number): string[] {
    return this.executionHistory.get(workflowId) || [];
  }
  
  /**
   * Stop a running execution
   * @param executionId - ID of the execution to stop
   * @returns True if execution was stopped, false otherwise
   */
  stopExecution(executionId: string): boolean {
    const context = this.activeExecutions.get(executionId);
    
    if (!context || context.status !== ExecutionStatus.RUNNING) {
      return false;
    }
    
    // Update execution context
    context.status = ExecutionStatus.STOPPED;
    context.endTime = new Date();
    
    // Send execution update
    this.sendExecutionUpdate(executionId, {
      status: context.status
    });
    
    return true;
  }
  
  /**
   * Run a workflow
   * @param executionId - ID of the execution
   * @param workflow - Workflow definition
   */
  private async runWorkflow(
    executionId: string,
    workflow: { nodes: Node[], edges: Edge[] }
  ): Promise<void> {
    const context = this.activeExecutions.get(executionId);
    
    if (!context) {
      throw new Error('Execution context not found');
    }
    
    // Set status to running
    context.status = ExecutionStatus.RUNNING;
    
    // Send execution update
    this.sendExecutionUpdate(executionId, {
      status: context.status
    });
    
    try {
      // Find trigger nodes (nodes with no incoming edges)
      const { nodes, edges } = workflow;
      const nodesWithIncomingEdges = new Set<string>();
      
      // Collect all nodes that have incoming edges
      for (const edge of edges) {
        nodesWithIncomingEdges.add(edge.target);
      }
      
      // Find nodes with no incoming edges (trigger nodes)
      const triggerNodes = nodes.filter(node => !nodesWithIncomingEdges.has(node.id));
      
      if (triggerNodes.length === 0) {
        throw new Error('No trigger nodes found in workflow');
      }
      
      // Execute each trigger node
      for (const triggerNode of triggerNodes) {
        await this.executeNode(executionId, triggerNode.id, workflow);
      }
      
      // Set status to completed
      context.status = ExecutionStatus.COMPLETED;
      context.endTime = new Date();
      
      // Send execution update
      this.sendExecutionUpdate(executionId, {
        status: context.status
      });
    } catch (error: any) {
      // Set status to failed
      context.status = ExecutionStatus.FAILED;
      context.lastError = error.message;
      context.endTime = new Date();
      
      // Send execution update
      this.sendExecutionUpdate(executionId, {
        status: context.status,
        error: context.lastError
      });
      
      throw error;
    }
  }
  
  /**
   * Execute a node and its downstream nodes
   * @param executionId - ID of the execution
   * @param nodeId - ID of the node to execute
   * @param workflow - Workflow definition
   * @returns Output of the node
   */
  private async executeNode(
    executionId: string,
    nodeId: string,
    workflow: { nodes: Node[], edges: Edge[] }
  ): Promise<any> {
    const context = this.activeExecutions.get(executionId);
    
    if (!context) {
      throw new Error('Execution context not found');
    }
    
    // Check if node has already been executed
    if (context.nodeResults[nodeId]) {
      return context.nodeResults[nodeId].output;
    }
    
    // Find node in workflow
    const node = workflow.nodes.find(n => n.id === nodeId);
    
    if (!node) {
      throw new Error(`Node ${nodeId} not found in workflow`);
    }
    
    // Initialize node result
    const nodeResult: NodeResult = {
      nodeId,
      status: NodeStatus.RUNNING,
      startTime: new Date()
    };
    
    // Update execution context
    context.nodeResults[nodeId] = nodeResult;
    context.currentNodeId = nodeId;
    
    // Send node update
    this.sendExecutionUpdate(executionId, {
      nodeId,
      nodeStatus: nodeResult.status
    });
    
    try {
      // Execute node based on type
      const output = await this.processNode(node, context.variables, workflow);
      
      // Update node result
      nodeResult.status = NodeStatus.COMPLETED;
      nodeResult.output = output;
      nodeResult.endTime = new Date();
      nodeResult.executionTime = nodeResult.endTime.getTime() - (nodeResult.startTime?.getTime() || 0);
      
      // Send node update
      this.sendExecutionUpdate(executionId, {
        nodeId,
        nodeStatus: nodeResult.status,
        output: nodeResult.output
      });
      
      // Find outgoing edges
      let outgoingEdges = workflow.edges.filter(edge => edge.source === nodeId);
      
      // If conditional node, filter edges based on condition result
      if (node.type === 'CONDITION' && output && typeof output === 'object') {
        // Get the output handle ID from the condition result
        const outputHandle = output.outputHandle;
        
        if (outputHandle) {
          // Filter edges to only include the matching output handle
          outgoingEdges = outgoingEdges.filter(edge => 
            edge.sourceHandle === outputHandle || 
            // For backward compatibility with edges that don't specify sourceHandle
            (!edge.sourceHandle && outputHandle === 'output')
          );
        } else if (output.noPathTaken) {
          // No valid path available, skip downstream execution
          outgoingEdges = [];
        }
      }
      
      // Execute downstream nodes
      for (const edge of outgoingEdges) {
        await this.executeNode(executionId, edge.target, workflow);
      }
      
      return output;
    } catch (error: any) {
      // Update node result
      nodeResult.status = NodeStatus.FAILED;
      nodeResult.error = error.message;
      nodeResult.endTime = new Date();
      nodeResult.executionTime = nodeResult.endTime.getTime() - (nodeResult.startTime?.getTime() || 0);
      
      // Send node update
      this.sendExecutionUpdate(executionId, {
        nodeId,
        nodeStatus: nodeResult.status,
        error: nodeResult.error
      });
      
      throw error;
    }
  }
  
  /**
   * Process a node based on its type
   * @param node - Node to process
   * @param variables - Current workflow variables
   * @param workflow - Workflow definition
   * @returns Output of the node
   */
  private async processNode(
    node: Node,
    variables: Record<string, any>,
    workflow: { nodes: Node[], edges: Edge[] }
  ): Promise<any> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock implementation for now - we'll implement actual node processing logic later
    const data = node.data || {};
    const type = node.type;
    
    // Process different node types
    switch (type) {
      case 'MANUAL_TRIGGER':
      case 'SCHEDULE_TRIGGER':
      case 'WEBHOOK_TRIGGER':
      case 'EVENT_TRIGGER':
        // Trigger nodes just pass through their data
        return { message: 'Workflow triggered', ...data };
        
      case 'TEXT_INPUT':
      case 'FILE_INPUT':
      case 'DATA_SOURCE':
        // Input nodes return their input data
        return data.value || { value: 'Sample input' };
        
      case 'FILTER':
      case 'TRANSFORM':
      case 'MERGE':
      case 'SPLIT':
        // Processing nodes transform their input
        return { processed: true, value: data.value || 'Processed data' };
        
      case 'CONDITION':
        // Conditional node - check conditions and determine output path
        return this.processConditionalNode(node, variables);
        
      case 'OCR':
      case 'TEXT_GENERATION':
      case 'AGENT':
      case 'SCRAPER':
        // AI nodes perform AI operations
        return { type: 'ai_output', result: 'Sample AI output' };
        
      case 'API_REQUEST':
      case 'DATABASE':
      case 'WEBHOOK':
        // Integration nodes connect to external services
        return { status: 'success', data: { result: 'Sample integration result' } };
        
      case 'EMAIL':
      case 'NOTIFICATION':
      case 'FILE_OUTPUT':
      case 'DATA_EXPORT':
        // Output nodes produce output
        return { sent: true, message: 'Output produced' };
        
      case 'SWITCH':
      case 'LOOP':
      case 'PARALLEL':
        // Flow control nodes manage execution flow
        return { flow: 'controlled', result: 'Sample flow control result' };
        
      case 'DELAY':
        // Delay execution for specified time
        const delayMs = data.delayMs || 1000;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return { delayed: true, delayMs };
        
      case 'LOGGER':
        // Log data
        console.log(`[Workflow Logger] Node ${node.id}:`, data);
        return { logged: true, data };
        
      case 'CODE':
        // Execute custom code
        return { executed: true, result: 'Sample code execution result' };
        
      case 'VARIABLE':
        // Set or get variable
        return { variable: data.name, value: data.value };
        
      default:
        // Default handler for unknown node types
        return { processed: true, nodeType: type };
    }
  }
  
  /**
   * Process a conditional node
   * @param node - Conditional node
   * @param variables - Current workflow variables
   * @returns Result of the condition evaluation
   */
  private processConditionalNode(
    node: Node,
    variables: Record<string, any>
  ): any {
    const data = node.data || {};
    
    // Check if using custom code
    if (data.useCustomCode && data.customCode) {
      try {
        // Execute custom code in a safe way
        // Note: In a real implementation, this should use a sandbox
        const result = { output: 'Custom code condition result', conditionMet: true };
        return result;
      } catch (error: any) {
        throw new Error(`Error executing custom code: ${error.message}`);
      }
    }
    
    // Process standard conditions
    const conditions = data.conditions || [];
    
    // Check each condition
    for (const condition of conditions) {
      const { field, operator, value } = condition;
      let fieldValue;
      
      // Extract field value from variables or context
      try {
        // This is a simplified approach - in real code we'd use a safer evaluation method
        fieldValue = variables[field] || null;
      } catch (error) {
        fieldValue = null;
      }
      
      // Evaluate condition
      let conditionMet = false;
      
      switch (operator) {
        case '==':
          conditionMet = fieldValue == value;
          break;
        case '!=':
          conditionMet = fieldValue != value;
          break;
        case '>':
          conditionMet = fieldValue > value;
          break;
        case '<':
          conditionMet = fieldValue < value;
          break;
        case '>=':
          conditionMet = fieldValue >= value;
          break;
        case '<=':
          conditionMet = fieldValue <= value;
          break;
        case 'contains':
          conditionMet = String(fieldValue).includes(value);
          break;
        case 'startsWith':
          conditionMet = String(fieldValue).startsWith(value);
          break;
        case 'endsWith':
          conditionMet = String(fieldValue).endsWith(value);
          break;
        case 'isEmpty':
          conditionMet = !fieldValue || 
                        (Array.isArray(fieldValue) && fieldValue.length === 0) || 
                        (typeof fieldValue === 'string' && fieldValue.trim() === '');
          break;
        case 'isNotEmpty':
          conditionMet = fieldValue && 
                        (!Array.isArray(fieldValue) || fieldValue.length > 0) && 
                        (typeof fieldValue !== 'string' || fieldValue.trim() !== '');
          break;
        case 'isNull':
          conditionMet = fieldValue === null || fieldValue === undefined;
          break;
        case 'isNotNull':
          conditionMet = fieldValue !== null && fieldValue !== undefined;
          break;
        default:
          conditionMet = false;
      }
      
      if (conditionMet) {
        return {
          conditionMet: true,
          condition: condition,
          outputHandle: condition.outputHandle,
          fieldValue
        };
      }
    }
    
    // No conditions met, use else path if available
    if (data.hasElseCondition) {
      return {
        conditionMet: false,
        outputHandle: 'else',
        defaultPath: true
      };
    }
    
    // No else path, return basic result
    return {
      conditionMet: false,
      noPathTaken: true
    };
  }
  
  /**
   * Send execution update via WebSocket
   * @param executionId - ID of the execution
   * @param update - Update data
   */
  private sendExecutionUpdate(
    executionId: string,
    update: {
      status?: string;
      nodeId?: string;
      nodeStatus?: string;
      output?: any;
      error?: string;
    }
  ): void {
    const event: WebSocketEvent = {
      type: 'execution_update',
      executionId,
      timestamp: new Date().toISOString(),
      ...update
    };
    webSocketHandler.sendExecutionEvent(executionId, event);
  }
}

// Create singleton instance
const workflowService = new WorkflowService();
export default workflowService;