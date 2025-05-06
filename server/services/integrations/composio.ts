/**
 * Composio Integration Service
 * 
 * This service provides integration with Composio for API workflow orchestration.
 * It supports connecting to Composio API, managing workflows, triggers, actions, and executions.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { log } from '../../vite';

/**
 * Composio Resource Base Interface
 */
export interface ComposioResource {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Composio Workflow Configuration
 */
export interface ComposioWorkflow extends ComposioResource {
  workflowId: string;
  description: string;
  version: number;
  status: 'active' | 'inactive' | 'draft';
  definition: any;
}

/**
 * Composio Trigger Configuration
 */
export interface ComposioTrigger extends ComposioResource {
  triggerId: string;
  workflowId: string;
  triggerType: string;
  configuration: Record<string, any>;
}

/**
 * Composio Action Configuration
 */
export interface ComposioAction extends ComposioResource {
  actionId: string;
  workflowId: string;
  actionType: string;
  configuration: Record<string, any>;
}

/**
 * Composio Execution Configuration
 */
export interface ComposioExecution {
  executionId: string;
  workflowId: string;
  triggerId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: string;
  endTime: string | null;
  input: any;
  output: any;
  error: string | null;
}

/**
 * Composio Client Configuration
 */
export interface ComposioConfig {
  apiUrl: string;
  apiKey: string;
  organizationId?: string;
}

/**
 * Composio Client for interacting with Composio API
 */
export class ComposioClient {
  private client: AxiosInstance;
  private organizationId?: string;

  /**
   * Create a new Composio client
   * 
   * @param config Configuration for connecting to Composio
   */
  constructor(config: ComposioConfig) {
    this.organizationId = config.organizationId;
    
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
    };
    
    this.client = axios.create(axiosConfig);
  }

  /**
   * Get all workflows
   */
  async getWorkflows(): Promise<ComposioWorkflow[]> {
    try {
      const response = await this.client.get('workflows', {
        params: this.organizationId ? { organizationId: this.organizationId } : undefined
      });
      
      return response.data.workflows || [];
    } catch (error: any) {
      log(`Error getting Composio workflows: ${error.message}`, 'error');
      throw new Error(`Failed to get workflows: ${error.message}`);
    }
  }

  /**
   * Get workflow by ID
   * 
   * @param workflowId Workflow ID
   */
  async getWorkflow(workflowId: string): Promise<ComposioWorkflow> {
    try {
      const response = await this.client.get(`workflows/${workflowId}`);
      return response.data;
    } catch (error: any) {
      log(`Error getting Composio workflow: ${error.message}`, 'error');
      throw new Error(`Failed to get workflow: ${error.message}`);
    }
  }

  /**
   * Create a new workflow
   * 
   * @param name Workflow name
   * @param description Workflow description
   * @param definition Workflow definition
   */
  async createWorkflow(
    name: string,
    description: string,
    definition: any
  ): Promise<ComposioWorkflow> {
    try {
      const response = await this.client.post('workflows', {
        name,
        description,
        definition,
        ...(this.organizationId ? { organizationId: this.organizationId } : {})
      });
      
      return response.data;
    } catch (error: any) {
      log(`Error creating Composio workflow: ${error.message}`, 'error');
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Update an existing workflow
   * 
   * @param workflowId Workflow ID
   * @param updates Updates to apply to the workflow
   */
  async updateWorkflow(
    workflowId: string,
    updates: Partial<Omit<ComposioWorkflow, 'id' | 'workflowId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ComposioWorkflow> {
    try {
      const response = await this.client.patch(`workflows/${workflowId}`, updates);
      return response.data;
    } catch (error: any) {
      log(`Error updating Composio workflow: ${error.message}`, 'error');
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  /**
   * Delete a workflow
   * 
   * @param workflowId Workflow ID
   */
  async deleteWorkflow(workflowId: string): Promise<boolean> {
    try {
      await this.client.delete(`workflows/${workflowId}`);
      return true;
    } catch (error: any) {
      log(`Error deleting Composio workflow: ${error.message}`, 'error');
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  /**
   * Get workflow executions
   * 
   * @param workflowId Workflow ID
   */
  async getExecutions(workflowId?: string): Promise<ComposioExecution[]> {
    try {
      const response = await this.client.get('executions', {
        params: {
          ...(workflowId ? { workflowId } : {}),
          ...(this.organizationId ? { organizationId: this.organizationId } : {})
        }
      });
      
      return response.data.executions || [];
    } catch (error: any) {
      log(`Error getting Composio executions: ${error.message}`, 'error');
      throw new Error(`Failed to get executions: ${error.message}`);
    }
  }

  /**
   * Get execution details
   * 
   * @param executionId Execution ID
   */
  async getExecution(executionId: string): Promise<ComposioExecution> {
    try {
      const response = await this.client.get(`executions/${executionId}`);
      return response.data;
    } catch (error: any) {
      log(`Error getting Composio execution: ${error.message}`, 'error');
      throw new Error(`Failed to get execution: ${error.message}`);
    }
  }

  /**
   * Trigger workflow execution
   * 
   * @param workflowId Workflow ID
   * @param input Input data for the workflow
   */
  async triggerWorkflow(workflowId: string, input: any): Promise<ComposioExecution> {
    try {
      const response = await this.client.post('executions', {
        workflowId,
        input,
      });
      
      return response.data;
    } catch (error: any) {
      log(`Error triggering Composio workflow: ${error.message}`, 'error');
      throw new Error(`Failed to trigger workflow: ${error.message}`);
    }
  }

  /**
   * Test connection to Composio API
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to get workflows as a connection test
      await this.getWorkflows();
      return true;
    } catch (error: any) {
      log(`Error testing Composio connection: ${error.message}`, 'error');
      return false;
    }
  }
}

/**
 * Create Composio client from configuration
 * 
 * @param config Composio configuration
 * @returns Composio client
 */
export function createComposioClient(config: ComposioConfig): ComposioClient {
  return new ComposioClient(config);
}