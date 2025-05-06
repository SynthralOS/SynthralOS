/**
 * Workflow Executor Service
 * 
 * This service is responsible for executing workflows and managing their state.
 */

import { Workflow, WorkflowExecution, ExecutionStatus } from '@shared/schema';
import { NodeType } from '../lib/node-types';
import { storage } from '../storage';
import { LangGraphExecutor } from './langgraph-executor';
import { log } from '../vite';

// Define WebSocketEvent type directly to avoid circular dependencies
export type WebSocketEvent = {
  type: 
    // Workflow execution events
    | 'execution_started' 
    | 'execution_completed' 
    | 'execution_failed'
    | 'execution_paused'
    | 'execution_resumed'
    | 'execution_cancelled'
    // Node execution events
    | 'node_execution_update'
    // Routing events
    | 'routing_update'
    // LangGraph specific events
    | 'langgraph_state_update'
    | 'langgraph_memory_update'
    | 'langgraph_agent_message'
    | 'langgraph_tool_execution'
    // General events
    | 'status_update'
    | 'error'
    | 'log';
  data: any;
};

/**
 * Workflow Executor class
 * Handles execution of different types of workflows
 */
export class WorkflowExecutor {
  private workflowExecution: WorkflowExecution;
  private workflow: Workflow;
  private sendWebSocketEvent: (event: WebSocketEvent) => void;
  private abortController: AbortController;
  private executionId: number;
  private langGraphExecutor: LangGraphExecutor | null = null;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  
  // Additional properties for tracking execution state
  public currentNodes: string[] = [];
  public completedNodes: string[] = [];
  public nodeResults: Map<string, any> = new Map();
  public status: ExecutionStatus = ExecutionStatus.QUEUED;
  public startTime: Date = new Date();
  public endTime: Date | null = null;
  public logs: string[] = [];

  constructor(
    workflowExecution: WorkflowExecution, 
    workflow: Workflow, 
    sendWebSocketEvent: (event: WebSocketEvent) => void
  ) {
    this.workflowExecution = workflowExecution;
    this.workflow = workflow;
    this.sendWebSocketEvent = sendWebSocketEvent;
    this.abortController = new AbortController();
    this.executionId = workflowExecution.id;
  }

  /**
   * Execute the workflow
   */
  public async execute(): Promise<void> {
    try {
      // Initialize execution
      await this.initializeExecution();

      // Determine the workflow type
      if (this.isLangGraphWorkflow()) {
        await this.executeLangGraphWorkflow();
      } else {
        await this.executeStandardWorkflow();
      }
    } catch (error: any) {
      await this.failExecution(error);
    }
  }

  /**
   * Pause the workflow execution
   */
  public async pause(): Promise<void> {
    this.isPaused = true;
    
    // Pause LangGraph executor if present
    if (this.langGraphExecutor) {
      await this.langGraphExecutor.pause();
    }
    
    // Update status in the database
    await storage.updateWorkflowExecution(this.executionId, {
      status: 'paused' as any,
    });

    // Send pause event
    this.sendWebSocketEvent({
      type: 'execution_paused',
      data: {
        executionId: this.executionId,
      },
    });
  }

  /**
   * Resume the workflow execution
   */
  public async resume(): Promise<void> {
    this.isPaused = false;
    
    // Resume LangGraph executor if present
    if (this.langGraphExecutor) {
      await this.langGraphExecutor.resume();
    }
    
    // Update status in the database
    await storage.updateWorkflowExecution(this.executionId, {
      status: ExecutionStatus.RUNNING as any,
    });

    // Send resume event
    this.sendWebSocketEvent({
      type: 'execution_resumed',
      data: {
        executionId: this.executionId,
      },
    });
  }

  /**
   * Cancel the workflow execution
   */
  public async cancel(): Promise<void> {
    this.isCancelled = true;
    this.abortController.abort();

    // Cancel LangGraph executor if present
    if (this.langGraphExecutor) {
      await this.langGraphExecutor.cancel();
    }

    // Update status in the database
    await storage.updateWorkflowExecution(this.executionId, {
      status: ExecutionStatus.CANCELLED as any,
      completedAt: new Date(),
    });

    // Send cancel event
    this.sendWebSocketEvent({
      type: 'execution_cancelled',
      data: {
        executionId: this.executionId,
      },
    });
  }

  /**
   * Initialize execution
   */
  private async initializeExecution(): Promise<void> {
    // Update the workflow execution status
    await storage.updateWorkflowExecution(this.executionId, {
      status: ExecutionStatus.RUNNING as any,
    });

    // Send start event
    this.sendWebSocketEvent({
      type: 'execution_started',
      data: {
        executionId: this.executionId,
      },
    });
  }

  /**
   * Complete execution
   */
  private async completeExecution(result: any): Promise<void> {
    // Update the workflow execution status
    await storage.updateWorkflowExecution(this.executionId, {
      status: ExecutionStatus.COMPLETED as any,
      completedAt: new Date(),
      result,
    });

    // Send completion event
    this.sendWebSocketEvent({
      type: 'execution_completed',
      data: {
        executionId: this.executionId,
        result,
      },
    });
  }

  /**
   * Fail execution
   */
  private async failExecution(error: Error): Promise<void> {
    console.error('Workflow execution failed:', error);

    // Update the workflow execution status
    await storage.updateWorkflowExecution(this.executionId, {
      status: ExecutionStatus.FAILED as any,
      completedAt: new Date(),
      result: { error: error.message },
    });

    // Send failure event
    this.sendWebSocketEvent({
      type: 'execution_failed',
      data: {
        executionId: this.executionId,
        error: error.message,
      },
    });
  }

  /**
   * Check if the workflow is a LangGraph workflow
   */
  private isLangGraphWorkflow(): boolean {
    // Type assertion to help with accessing data.nodes
    const workflowData = this.workflow.data as { nodes: any[] };
    const nodes = workflowData?.nodes || [];
    
    // Check if any of the nodes are LangGraph nodes
    return nodes.some((node: any) => 
      node.type === NodeType.LANGGRAPH_STATE ||
      node.type === NodeType.LANGGRAPH_NODE ||
      node.type === NodeType.LANGGRAPH_EDGE ||
      node.type === NodeType.LANGGRAPH_CONDITIONAL ||
      node.type === NodeType.AGENT_NODE ||
      node.type === NodeType.AGENT_SUPERVISOR ||
      node.type === NodeType.MEMORY_STORE ||
      node.type === NodeType.CONTEXT_RETRIEVER ||
      node.type === NodeType.TOOL_NODE ||
      node.type === NodeType.TOOL_EXECUTOR ||
      node.type === NodeType.CONVERSATION_CHAIN ||
      node.type === NodeType.CONVERSATION_ROUTER ||
      node.type === NodeType.OUTPUT_PARSER ||
      node.type === NodeType.OUTPUT_FORMATTER
    );
  }

  /**
   * Execute a LangGraph workflow
   */
  private async executeLangGraphWorkflow(): Promise<void> {
    // Create a LangGraph executor
    this.langGraphExecutor = new LangGraphExecutor(
      this.workflowExecution,
      this.workflow,
      this.sendWebSocketEvent
    );
    
    // Execute the LangGraph workflow
    await this.langGraphExecutor.execute();
  }

  /**
   * Execute a standard workflow
   */
  private async executeStandardWorkflow(): Promise<void> {
    // For now, just complete the execution with a dummy result
    // This will be replaced with actual standard workflow execution logic
    await this.completeExecution({
      message: 'Standard workflow execution not yet implemented'
    });
  }
}

// Workflow execution registry to track active executions
class WorkflowExecutionRegistry {
  private executors: Map<number, WorkflowExecutor> = new Map();

  /**
   * Register a new executor
   */
  public register(executionId: number, executor: WorkflowExecutor): void {
    this.executors.set(executionId, executor);
  }

  /**
   * Get an executor by execution ID
   */
  public get(executionId: number): WorkflowExecutor | undefined {
    return this.executors.get(executionId);
  }

  /**
   * Unregister an executor
   */
  public unregister(executionId: number): void {
    this.executors.delete(executionId);
  }

  /**
   * Get the count of active executors
   */
  public getActiveCount(): number {
    return this.executors.size;
  }
}

// Export a singleton instance of the registry
export const executionRegistry = new WorkflowExecutionRegistry();

/**
 * Start a workflow execution
 */
export async function startWorkflowExecution(
  workflowId: number,
  userId: number,
  sendWebSocketEvent: (event: WebSocketEvent) => void
): Promise<number> {
  // Get the workflow
  const workflow = await storage.getWorkflow(workflowId);
  
  if (!workflow) {
    throw new Error(`Workflow with ID ${workflowId} not found`);
  }
  
  // Create a new execution
  const workflowExecution = await storage.createWorkflowExecution({
    workflowId,
    status: ExecutionStatus.QUEUED,
    triggeredById: userId,
    startedAt: new Date(),
  });
  
  // Create a workflow executor
  const executor = new WorkflowExecutor(
    workflowExecution,
    workflow,
    sendWebSocketEvent
  );
  
  // Register the executor
  executionRegistry.register(workflowExecution.id, executor);
  
  // Execute the workflow asynchronously
  executor.execute().finally(() => {
    // Unregister the executor when done
    executionRegistry.unregister(workflowExecution.id);
  });
  
  return workflowExecution.id;
}

/**
 * Pause a workflow execution
 */
export async function pauseWorkflowExecution(
  executionId: number
): Promise<void> {
  const executor = executionRegistry.get(executionId);
  
  if (!executor) {
    throw new Error(`No active execution found for ID ${executionId}`);
  }
  
  await executor.pause();
}

/**
 * Resume a workflow execution
 */
export async function resumeWorkflowExecution(
  executionId: number
): Promise<void> {
  const executor = executionRegistry.get(executionId);
  
  if (!executor) {
    throw new Error(`No active execution found for ID ${executionId}`);
  }
  
  await executor.resume();
}

/**
 * Cancel a workflow execution
 */
export async function cancelWorkflowExecution(
  executionId: number
): Promise<void> {
  const executor = executionRegistry.get(executionId);
  
  if (!executor) {
    throw new Error(`No active execution found for ID ${executionId}`);
  }
  
  await executor.cancel();
}

// Event system
type EventCallback = (data: any) => void;
const eventListeners: Record<string, EventCallback[]> = {};

/**
 * Register an event listener
 */
export function onEvent(eventName: string, callback: EventCallback): void {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);
}

/**
 * Emit an event
 */
export function emitEvent(eventName: string, data: any): void {
  const listeners = eventListeners[eventName];
  if (listeners) {
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${eventName} event handler:`, error);
      }
    });
  }
}