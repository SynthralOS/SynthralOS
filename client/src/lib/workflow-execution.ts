/**
 * Workflow Execution Client
 * Manages communication with the backend for workflow execution
 */

// Basic execution statuses
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stopped';

// Basic node statuses for execution visualization
export type NodeStatus = 'idle' | 'pending' | 'running' | 'completed' | 'failed';

// Execution update structure for websocket communication
export interface ExecutionUpdate {
  executionId: string;
  status: ExecutionStatus;
  nodeId?: string;
  nodeStatus?: NodeStatus;
  output?: any;
  error?: string;
  timestamp: string;
}

// Export Position and NodeType from node-types to avoid circular dependencies
export { Position, NodeType } from './node-types';

// Import Node and Edge from local workflow file instead of schema
import type { Node, Edge } from '@/lib/workflow';
export type { Node, Edge };

/**
 * Workflow Execution Client
 * Handles communication with backend for workflow execution
 */
class WorkflowExecutionClient {
  private socket: WebSocket | null = null;
  private listeners: Map<string, ((update: ExecutionUpdate) => void)[]> = new Map();
  private globalListeners: ((update: ExecutionUpdate) => void)[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Connect to the execution websocket
   * @param executionId - Optional execution ID to subscribe to specific execution
   * @param listener - Optional listener for updates
   */
  connect(executionId?: string, listener?: (update: ExecutionUpdate) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Calculate WebSocket URL based on current location
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws`;
        
        console.log(`Attempting to connect to WebSocket at: ${wsUrl}`);
        
        // Close existing socket if any
        if (this.socket) {
          this.socket.close();
        }
        
        // Create new WebSocket connection with better error handling
        console.log('Creating new WebSocket connection with URL:', wsUrl);
        
        try {
          // Add origin and custom headers for debugging
          this.socket = new WebSocket(wsUrl);
          console.log('WebSocket object created, readyState:', this.socket.readyState);
        } catch (error) {
          console.error('Error creating WebSocket:', error);
          reject(new Error(`Failed to create WebSocket: ${error instanceof Error ? error.message : String(error)}`));
          return;
        }
        
        // Connection timeout - reject if connection takes too long
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected && this.socket) {
            console.error('WebSocket connection timeout after 10 seconds');
            console.log('Connection state at timeout:', this.socket.readyState);
            this.socket.close();
            reject(new Error('WebSocket connection timeout after 10 seconds'));
          }
        }, 10000);
        
        // Setup event handlers
        this.socket.onopen = () => {
          console.log('WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          clearTimeout(connectionTimeout);
          
          // Subscribe to specific execution if ID provided
          if (executionId) {
            this.subscribeToExecution(executionId);
            
            // Register listener if provided
            if (listener) {
              this.addExecutionListener(executionId, listener);
            }
          }
          
          resolve();
        };
        
        this.socket.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnected = false;
          clearTimeout(connectionTimeout);
          
          // Attempt to reconnect if not a clean closure
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            
            setTimeout(() => {
              this.connect(executionId, listener)
                .catch(err => console.error('Failed to reconnect:', err));
            }, this.reconnectDelay * this.reconnectAttempts);
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          console.log('WebSocket readyState:', this.socket ? this.socket.readyState : 'socket is null');
          console.log('Connection was attempted to:', wsUrl);
          
          if (!this.isConnected) {
            clearTimeout(connectionTimeout);
            const errorMessage = this.socket ? `Failed to establish WebSocket connection. readyState: ${this.socket.readyState}` : 'Socket is null';
            reject(new Error(errorMessage));
          }
        };
        
        this.socket.onmessage = (event) => {
          try {
            // Parse incoming message
            const data = JSON.parse(event.data);
            console.log('Received WebSocket message:', data);
            
            // Handle connection_established messages separately
            if (data.type === 'connection_established') {
              console.log('WebSocket handshake complete, clientId:', data.clientId);
              return;
            }
            
            // Handle error messages
            if (data.type === 'error') {
              console.error('WebSocket server error:', data.message, data.error);
              return;
            }
            
            // Process execution update
            if (data.type === 'execution_update') {
              const update = data as unknown as ExecutionUpdate;
              
              // Notify execution-specific listeners
              if (update.executionId) {
                const executionListeners = this.listeners.get(update.executionId) || [];
                executionListeners.forEach(listener => {
                  try {
                    listener(update);
                  } catch (err) {
                    console.error('Error in execution listener:', err);
                  }
                });
              }
              
              // Notify global listeners
              this.globalListeners.forEach(listener => {
                try {
                  listener(update);
                } catch (err) {
                  console.error('Error in global listener:', err);
                }
              });
            }
          } catch (err) {
            console.error('Error processing WebSocket message:', err, event.data);
          }
        };
      } catch (err) {
        console.error('Error connecting to WebSocket:', err);
        reject(err);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    // Clear all listeners
    this.listeners.clear();
    this.globalListeners = [];
    this.isConnected = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Send a message to the WebSocket
   * @param message - Message to send
   */
  private sendMessage(message: any): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    
    this.socket.send(JSON.stringify(message));
  }

  /**
   * Subscribe to updates for a specific execution
   * @param executionId - Execution ID to subscribe to
   */
  subscribeToExecution(executionId: string): void {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected');
    }
    
    this.sendMessage({
      type: 'subscribe',
      executionId
    });
  }

  /**
   * Unsubscribe from updates for a specific execution
   * @param executionId - Execution ID to unsubscribe from
   */
  unsubscribeFromExecution(executionId: string): void {
    if (!this.isConnected) {
      return;
    }
    
    this.sendMessage({
      type: 'unsubscribe',
      executionId
    });
    
    // Remove all listeners for this execution
    this.listeners.delete(executionId);
  }

  /**
   * Add a listener for updates from a specific execution
   * @param executionId - Execution ID to listen for
   * @param listener - Callback function for updates
   */
  addExecutionListener(executionId: string, listener: (update: ExecutionUpdate) => void): void {
    const executionListeners = this.listeners.get(executionId) || [];
    executionListeners.push(listener);
    this.listeners.set(executionId, executionListeners);
  }

  /**
   * Remove a listener for updates from a specific execution
   * @param executionId - Execution ID to remove listener for
   * @param listener - Listener to remove
   */
  removeExecutionListener(executionId: string, listener: (update: ExecutionUpdate) => void): void {
    const executionListeners = this.listeners.get(executionId) || [];
    const index = executionListeners.indexOf(listener);
    
    if (index !== -1) {
      executionListeners.splice(index, 1);
      this.listeners.set(executionId, executionListeners);
    }
  }

  /**
   * Subscribe to all execution updates
   * @param listener - Callback function for all updates
   * @returns Cleanup function to unsubscribe
   */
  subscribeToAllUpdates(listener: (update: ExecutionUpdate) => void): () => void {
    this.globalListeners.push(listener);
    
    // Return cleanup function
    return () => {
      const index = this.globalListeners.indexOf(listener);
      if (index !== -1) {
        this.globalListeners.splice(index, 1);
      }
    };
  }

  /**
   * Execute a workflow
   * @param workflowId - Workflow ID to execute
   * @param workflow - Workflow definition (nodes and edges)
   * @param initialVariables - Initial variables for execution
   * @returns Execution ID
   */
  async executeWorkflow(
    workflowId: number,
    workflow: { nodes: any[], edges: any[] },
    initialVariables: Record<string, any> = {}
  ): Promise<string> {
    try {
      // Make API call to start execution
      const response = await fetch('/api/workflows/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workflowId,
          nodes: workflow.nodes,
          edges: workflow.edges,
          variables: initialVariables
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute workflow');
      }
      
      const data = await response.json();
      const executionId = data.executionId;
      
      // Ensure connection is established
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Subscribe to execution updates
      this.subscribeToExecution(executionId);
      
      return executionId;
    } catch (error) {
      console.error('Error executing workflow:', error);
      throw error;
    }
  }

  /**
   * Stop a running workflow execution
   * @param executionId - Execution ID to stop
   */
  async stopExecution(executionId: string): Promise<void> {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}/stop`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop execution');
      }
    } catch (error) {
      console.error('Error stopping execution:', error);
      throw error;
    }
  }

  /**
   * Get execution details
   * @param executionId - Execution ID to fetch details for
   */
  async getExecutionDetails(executionId: string): Promise<any> {
    try {
      const response = await fetch(`/api/workflows/executions/${executionId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch execution details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching execution details:', error);
      throw error;
    }
  }
}

// Export a singleton instance
const workflowExecutionClient = new WorkflowExecutionClient();
export default workflowExecutionClient;