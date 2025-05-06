/**
 * Panora integration for SynthralOS
 * 
 * This module provides unified API integration capabilities
 * using Panora.
 */

import axios from 'axios';

/**
 * Panora client options
 */
export interface PanoraOptions {
  apiUrl: string;
  apiKey: string;
  projectId: string;
  timeout?: number;
}

/**
 * Connection type enum
 */
export enum ConnectionType {
  CRM = 'crm',
  MARKETING = 'marketing',
  ACCOUNTING = 'accounting',
  TICKETING = 'ticketing',
  ATS = 'ats',
  HRIS = 'hris',
  FILE_STORAGE = 'file-storage',
  CUSTOM = 'custom'
}

/**
 * Connection status enum
 */
export enum ConnectionStatus {
  VALID = 'valid',
  INVALID = 'invalid',
  PENDING = 'pending',
  REAUTH_REQUIRED = 'reauth_required'
}

/**
 * Connection object
 */
export interface Connection {
  id: string;
  provider: string;
  providerType: ConnectionType;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
  token?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
  };
}

/**
 * Panora client for API interactions
 */
export class PanoraClient {
  private apiUrl: string;
  private apiKey: string;
  private projectId: string;
  private timeout: number;

  constructor(options: PanoraOptions) {
    this.apiUrl = options.apiUrl.endsWith('/') 
      ? options.apiUrl.slice(0, -1) 
      : options.apiUrl;
    this.apiKey = options.apiKey;
    this.projectId = options.projectId;
    this.timeout = options.timeout || 30000;
  }

  /**
   * Get all connections
   */
  async getConnections(): Promise<Connection[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/unified-connections`, 
        {
          headers: {
            'x-api-key': this.apiKey,
            'x-project-id': this.projectId,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Panora API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Get connection by ID
   */
  async getConnection(connectionId: string): Promise<Connection> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/api/v1/unified-connections/${connectionId}`,
        {
          headers: {
            'x-api-key': this.apiKey,
            'x-project-id': this.projectId,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Panora API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Create a connection link
   */
  async createConnectionLink(
    providerName: string, 
    providerType: ConnectionType
  ): Promise<{ link: string }> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/api/v1/unified-connections/link`,
        {
          provider: providerName,
          providerType,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'x-project-id': this.projectId,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );
      
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Panora API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Perform a unified API call
   */
  async callUnifiedApi(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    linkedId?: string,
    connectionId?: string
  ): Promise<any> {
    try {
      const url = `${this.apiUrl}/api/v1/${endpoint}`;
      const headers: Record<string, string> = {
        'x-api-key': this.apiKey,
        'x-project-id': this.projectId,
        'Content-Type': 'application/json'
      };

      if (linkedId) {
        headers['x-linked-id'] = linkedId;
      }

      if (connectionId) {
        headers['x-connection-id'] = connectionId;
      }

      const config = {
        method,
        url,
        headers,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined,
        timeout: this.timeout
      };

      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(`Panora API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}

/**
 * Singleton Panora client instance
 */
let panoraClient: PanoraClient | null = null;

/**
 * Get or create the Panora client instance
 */
export function getPanoraClient(): PanoraClient | null {
  if (!panoraClient && process.env.PANORA_API_URL && process.env.PANORA_API_KEY && process.env.PANORA_PROJECT_ID) {
    panoraClient = new PanoraClient({
      apiUrl: process.env.PANORA_API_URL,
      apiKey: process.env.PANORA_API_KEY,
      projectId: process.env.PANORA_PROJECT_ID
    });
  }
  return panoraClient;
}

/**
 * Utility functions for common Panora operations
 */
export const PanoraUtils = {
  /**
   * Get all active connections
   */
  getActiveConnections: async (): Promise<Connection[]> => {
    const client = getPanoraClient();
    if (!client) {
      console.warn('Panora client not initialized. Cannot get active connections.');
      return [];
    }

    const connections = await client.getConnections();
    return connections.filter(conn => conn.status === ConnectionStatus.VALID);
  },

  /**
   * Create a connection link for a specific provider
   */
  createConnectionLink: async (
    providerName: string,
    providerType: ConnectionType
  ): Promise<string | null> => {
    const client = getPanoraClient();
    if (!client) {
      console.warn('Panora client not initialized. Cannot create connection link.');
      return null;
    }

    const result = await client.createConnectionLink(providerName, providerType);
    return result.link;
  }
};