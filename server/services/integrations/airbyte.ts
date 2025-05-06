/**
 * Airbyte Integration Service
 * 
 * This service provides integration with Airbyte for data synchronization and ETL operations.
 * It supports connecting to Airbyte API, managing sources, destinations, connections and syncs.
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { log } from '../../vite';

/**
 * Airbyte Resource Base Interface
 */
export interface AirbyteResource {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Airbyte Source Configuration
 */
export interface AirbyteSource extends AirbyteResource {
  sourceId: string;
  sourceDefinitionId: string;
  connectionConfiguration: Record<string, any>;
}

/**
 * Airbyte Destination Configuration
 */
export interface AirbyteDestination extends AirbyteResource {
  destinationId: string;
  destinationDefinitionId: string;
  connectionConfiguration: Record<string, any>;
}

/**
 * Airbyte Connection Configuration
 */
export interface AirbyteConnection extends AirbyteResource {
  connectionId: string;
  sourceId: string;
  destinationId: string;
  syncCatalog: any;
  status: 'active' | 'inactive' | 'deprecated';
  schedule: {
    schedule_type: 'manual' | 'basic' | 'cron';
    basic_schedule?: {
      timeUnit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
      units: number;
    };
    cron_schedule?: {
      cronExpression: string;
      cronTimeZone: string;
    };
  };
}

/**
 * Airbyte Operation Response
 */
export interface AirbyteOperationResponse {
  operationId?: string;
  jobId?: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  startTime?: string;
  endTime?: string;
  bytesSynced?: number;
  recordsSynced?: number;
}

/**
 * Airbyte Client Configuration
 */
export interface AirbyteConfig {
  apiUrl: string;
  apiKey?: string;
  workspaceId: string;
  basicAuth?: {
    username: string;
    password: string;
  };
}

/**
 * Airbyte Client for interacting with Airbyte API
 */
export class AirbyteClient {
  private client: AxiosInstance;
  private workspaceId: string;

  /**
   * Create a new Airbyte client
   * 
   * @param config Configuration for connecting to Airbyte
   */
  constructor(config: AirbyteConfig) {
    this.workspaceId = config.workspaceId;
    
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.apiUrl.endsWith('/') ? config.apiUrl : `${config.apiUrl}/`,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add authorization if provided
    if (config.apiKey) {
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'Authorization': `Bearer ${config.apiKey}`,
      };
    } else if (config.basicAuth) {
      const auth = btoa(`${config.basicAuth.username}:${config.basicAuth.password}`);
      axiosConfig.headers = {
        ...axiosConfig.headers,
        'Authorization': `Basic ${auth}`,
      };
    }
    
    this.client = axios.create(axiosConfig);
  }

  /**
   * Get all sources in the workspace
   */
  async getSources(): Promise<AirbyteSource[]> {
    try {
      const response = await this.client.post('v1/sources/list', {
        workspaceId: this.workspaceId,
      });
      
      return response.data.sources || [];
    } catch (error: any) {
      log(`Error getting Airbyte sources: ${error.message}`, 'error');
      throw new Error(`Failed to get sources: ${error.message}`);
    }
  }

  /**
   * Create a new source
   * 
   * @param name Source name
   * @param sourceDefinitionId Source definition ID
   * @param connectionConfiguration Connection configuration
   * @returns Created source
   */
  async createSource(
    name: string,
    sourceDefinitionId: string,
    connectionConfiguration: Record<string, any>
  ): Promise<AirbyteSource> {
    try {
      const response = await this.client.post('v1/sources/create', {
        name,
        sourceDefinitionId,
        workspaceId: this.workspaceId,
        connectionConfiguration,
      });
      
      return response.data;
    } catch (error: any) {
      log(`Error creating Airbyte source: ${error.message}`, 'error');
      throw new Error(`Failed to create source: ${error.message}`);
    }
  }

  /**
   * Get all destinations in the workspace
   */
  async getDestinations(): Promise<AirbyteDestination[]> {
    try {
      const response = await this.client.post('v1/destinations/list', {
        workspaceId: this.workspaceId,
      });
      
      return response.data.destinations || [];
    } catch (error: any) {
      log(`Error getting Airbyte destinations: ${error.message}`, 'error');
      throw new Error(`Failed to get destinations: ${error.message}`);
    }
  }

  /**
   * Create a new destination
   * 
   * @param name Destination name
   * @param destinationDefinitionId Destination definition ID
   * @param connectionConfiguration Connection configuration
   * @returns Created destination
   */
  async createDestination(
    name: string,
    destinationDefinitionId: string,
    connectionConfiguration: Record<string, any>
  ): Promise<AirbyteDestination> {
    try {
      const response = await this.client.post('v1/destinations/create', {
        name,
        destinationDefinitionId,
        workspaceId: this.workspaceId,
        connectionConfiguration,
      });
      
      return response.data;
    } catch (error: any) {
      log(`Error creating Airbyte destination: ${error.message}`, 'error');
      throw new Error(`Failed to create destination: ${error.message}`);
    }
  }

  /**
   * Get all connections in the workspace
   */
  async getConnections(): Promise<AirbyteConnection[]> {
    try {
      const response = await this.client.post('v1/connections/list', {
        workspaceId: this.workspaceId,
      });
      
      return response.data.connections || [];
    } catch (error: any) {
      log(`Error getting Airbyte connections: ${error.message}`, 'error');
      throw new Error(`Failed to get connections: ${error.message}`);
    }
  }

  /**
   * Create a new connection between source and destination
   * 
   * @param sourceId Source ID
   * @param destinationId Destination ID
   * @param name Connection name
   * @param syncCatalog Sync catalog
   * @param schedule Schedule configuration
   * @returns Created connection
   */
  async createConnection(
    sourceId: string,
    destinationId: string,
    name: string,
    syncCatalog: any,
    schedule: AirbyteConnection['schedule']
  ): Promise<AirbyteConnection> {
    try {
      const response = await this.client.post('v1/connections/create', {
        name,
        sourceId,
        destinationId,
        syncCatalog,
        schedule,
        status: 'active',
      });
      
      return response.data;
    } catch (error: any) {
      log(`Error creating Airbyte connection: ${error.message}`, 'error');
      throw new Error(`Failed to create connection: ${error.message}`);
    }
  }

  /**
   * Trigger a sync operation for a connection
   * 
   * @param connectionId Connection ID
   * @returns Sync operation response
   */
  async triggerSync(connectionId: string): Promise<AirbyteOperationResponse> {
    try {
      const response = await this.client.post('v1/connections/sync', {
        connectionId,
      });
      
      return {
        jobId: response.data.job?.id,
        status: 'pending',
      };
    } catch (error: any) {
      log(`Error triggering Airbyte sync: ${error.message}`, 'error');
      throw new Error(`Failed to trigger sync: ${error.message}`);
    }
  }

  /**
   * Get the status of a sync job
   * 
   * @param jobId Job ID
   * @returns Job status
   */
  async getSyncStatus(jobId: string): Promise<AirbyteOperationResponse> {
    try {
      const response = await this.client.post('v1/jobs/get', {
        id: jobId,
      });
      
      const job = response.data.job;
      
      return {
        jobId: job.id,
        status: job.status,
        startTime: job.createdAt ? new Date(job.createdAt).toISOString() : undefined,
        endTime: job.updatedAt ? new Date(job.updatedAt).toISOString() : undefined,
        bytesSynced: job.bytesSynced,
        recordsSynced: job.recordsSynced,
      };
    } catch (error: any) {
      log(`Error getting Airbyte sync status: ${error.message}`, 'error');
      throw new Error(`Failed to get sync status: ${error.message}`);
    }
  }

  /**
   * Test connection to Airbyte API
   * 
   * @returns True if connection is successful
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to list workspaces as a connection test
      const response = await this.client.post('v1/workspaces/list');
      return Array.isArray(response.data.workspaces);
    } catch (error: any) {
      log(`Error testing Airbyte connection: ${error.message}`, 'error');
      return false;
    }
  }
}

/**
 * Create Airbyte client from configuration
 * 
 * @param config Airbyte configuration
 * @returns Airbyte client
 */
export function createAirbyteClient(config: AirbyteConfig): AirbyteClient {
  return new AirbyteClient(config);
}