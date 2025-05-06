/**
 * StackStorm integration for SynthralOS
 * 
 * This module provides automation and incident response capabilities
 * using StackStorm.
 */

import axios from 'axios';

/**
 * StackStorm client options
 */
export interface StackStormOptions {
  apiUrl: string;
  apiKey: string;
  timeout?: number;
}

/**
 * StackStorm action execution request
 */
export interface ActionExecutionRequest {
  action: string;
  parameters?: Record<string, any>;
  parentContext?: string;
}

/**
 * StackStorm action execution response
 */
export interface ActionExecutionResponse {
  id: string;
  action: string;
  status: 'requested' | 'scheduled' | 'running' | 'succeeded' | 'failed';
  parameters: Record<string, any>;
  result?: Record<string, any>;
  startTimestamp?: string;
  endTimestamp?: string;
}

/**
 * StackStorm rule creation request
 */
export interface RuleCreationRequest {
  name: string;
  pack: string;
  description?: string;
  enabled: boolean;
  trigger: {
    type: string;
    parameters?: Record<string, any>;
  };
  criteria?: Record<string, any>;
  action: {
    ref: string;
    parameters: Record<string, any>;
  };
}

/**
 * StackStorm client for API interactions
 */
export class StackStormClient {
  private apiUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(options: StackStormOptions) {
    this.apiUrl = options.apiUrl.endsWith('/') 
      ? options.apiUrl.slice(0, -1) 
      : options.apiUrl;
    this.apiKey = options.apiKey;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Execute a StackStorm action
   */
  async executeAction(request: ActionExecutionRequest): Promise<ActionExecutionResponse> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/executions`, 
        request,
        {
          headers: {
            'St2-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`StackStorm API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get execution result by ID
   */
  async getExecution(executionId: string): Promise<ActionExecutionResponse> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/v1/executions/${executionId}`,
        {
          headers: {
            'St2-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`StackStorm API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create a new rule
   */
  async createRule(rule: RuleCreationRequest): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/rules`,
        rule,
        {
          headers: {
            'St2-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`StackStorm API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Trigger a webhook
   */
  async triggerWebhook(hookName: string, payload: Record<string, any>): Promise<any> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/webhooks/${hookName}`,
        payload,
        {
          headers: {
            'St2-Api-Key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`StackStorm API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

/**
 * Singleton StackStorm client instance
 */
let stackStormClient: StackStormClient | null = null;

/**
 * Get or create the StackStorm client instance
 */
export function getStackStormClient(): StackStormClient | null {
  if (!stackStormClient && process.env.STACKSTORM_API_URL && process.env.STACKSTORM_API_KEY) {
    stackStormClient = new StackStormClient({
      apiUrl: process.env.STACKSTORM_API_URL,
      apiKey: process.env.STACKSTORM_API_KEY
    });
  }
  return stackStormClient;
}

/**
 * Predefined incident response actions
 */
export const IncidentResponseActions = {
  /**
   * Report a security incident
   */
  reportSecurityIncident: async (
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<ActionExecutionResponse | null> => {
    const client = getStackStormClient();
    if (!client) {
      console.warn('StackStorm client not initialized. Cannot report security incident.');
      return null;
    }

    return client.executeAction({
      action: 'synthralos.report_security_incident',
      parameters: {
        severity,
        description,
        occurred_at: new Date().toISOString(),
        metadata
      }
    });
  },

  /**
   * Perform automated remediation for a known issue
   */
  performRemediation: async (
    issueType: string,
    context: Record<string, any> = {}
  ): Promise<ActionExecutionResponse | null> => {
    const client = getStackStormClient();
    if (!client) {
      console.warn('StackStorm client not initialized. Cannot perform remediation.');
      return null;
    }

    return client.executeAction({
      action: 'synthralos.auto_remediate',
      parameters: {
        issue_type: issueType,
        context
      }
    });
  }
};