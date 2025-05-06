/**
 * Nango Integration Service
 * 
 * This service handles OAuth authentication flows using Nango as middleware.
 * Nango simplifies OAuth integration with various providers.
 */

import axios from 'axios';
import { storage } from '../../storage';

interface NangoConfig {
  secretKey: string;
  publicKey: string;
  hostUrl: string;
}

interface ConnectionParams {
  provider: string;
  connectionId: string;
  externalId: string;
  config?: Record<string, any>;
}

interface ProviderConfig {
  provider: string;
  providerConfigKey: string;
  authMode: 'oauth1' | 'oauth2';
}

export class NangoService {
  private secretKey: string;
  private publicKey: string;
  private hostUrl: string;
  private baseUrl: string = 'https://api.nango.dev/v1';
  private initialized: boolean = false;
  private registeredProviders: Map<string, ProviderConfig> = new Map();

  constructor() {
    // Will be initialized later with secretKey and publicKey
    this.secretKey = '';
    this.publicKey = '';
    this.hostUrl = '';
  }

  /**
   * Initialize the Nango service with API keys
   */
  initialize(config: NangoConfig): boolean {
    try {
      this.secretKey = config.secretKey;
      this.publicKey = config.publicKey;
      this.hostUrl = config.hostUrl || 'https://app.synthralos.com';
      this.initialized = true;
      
      console.log('[nango] Service initialized');
      return true;
    } catch (error) {
      console.error('[nango] Failed to initialize service:', error);
      return false;
    }
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get authorization URL for OAuth flow
   */
  async getAuthorizationUrl(provider: string, connectionId: string, redirectUri?: string): Promise<string | null> {
    if (!this.initialized) {
      console.error('[nango] Service not initialized');
      return null;
    }

    const providerConfig = this.registeredProviders.get(provider);
    if (!providerConfig) {
      console.error(`[nango] Provider ${provider} not registered`);
      return null;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/auth/connect/${providerConfig.providerConfigKey}`,
        {
          connection_id: connectionId,
          redirect_uri: redirectUri || `${this.hostUrl}/api/oauth/callback`
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data && response.data.auth_url) {
        return response.data.auth_url;
      }
      
      console.error('[nango] Failed to get authorization URL:', response.data);
      return null;
    } catch (error) {
      console.error('[nango] Error getting authorization URL:', error);
      return null;
    }
  }

  /**
   * Create a new connection for a user
   */
  async createConnection(params: ConnectionParams): Promise<boolean> {
    if (!this.initialized) {
      console.error('[nango] Service not initialized');
      return false;
    }

    try {
      await axios.post(
        `${this.baseUrl}/connection`,
        {
          provider: params.provider,
          connection_id: params.connectionId,
          external_id: params.externalId,
          credentials: {
            type: 'oauth',
            ...params.config
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('[nango] Error creating connection:', error);
      return false;
    }
  }

  /**
   * Get connection details
   */
  async getConnection(provider: string, connectionId: string): Promise<any> {
    if (!this.initialized) {
      console.error('[nango] Service not initialized');
      return null;
    }

    try {
      const response = await axios.get(
        `${this.baseUrl}/connection/${provider}/${connectionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('[nango] Error getting connection:', error);
      return null;
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(provider: string, connectionId: string): Promise<boolean> {
    if (!this.initialized) {
      console.error('[nango] Service not initialized');
      return false;
    }

    try {
      await axios.delete(
        `${this.baseUrl}/connection/${provider}/${connectionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.secretKey}`
          }
        }
      );
      
      return true;
    } catch (error) {
      console.error('[nango] Error deleting connection:', error);
      return false;
    }
  }

  /**
   * Make an API request through Nango (handles token refresh automatically)
   */
  async makeRequest(provider: string, connectionId: string, endpoint: string, method = 'GET', data?: any): Promise<any> {
    if (!this.initialized) {
      console.error('[nango] Service not initialized');
      return null;
    }

    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/proxy/${provider}/${connectionId}`,
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        },
        data: {
          endpoint,
          method,
          data
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('[nango] Error making API request:', error);
      return null;
    }
  }

  /**
   * Register provider configurations
   */
  registerProvider(config: ProviderConfig): void {
    this.registeredProviders.set(config.provider, config);
    console.log(`[nango] Registered provider: ${config.provider}`);
  }

  /**
   * Register common OAuth providers
   */
  registerCommonProviders(): void {
    // Social media providers
    this.registerProvider({ provider: 'github', providerConfigKey: 'github', authMode: 'oauth2' });
    this.registerProvider({ provider: 'twitter', providerConfigKey: 'twitter', authMode: 'oauth2' });
    this.registerProvider({ provider: 'linkedin', providerConfigKey: 'linkedin', authMode: 'oauth2' });
    this.registerProvider({ provider: 'google', providerConfigKey: 'google', authMode: 'oauth2' });
    
    // Marketing & CRM providers
    this.registerProvider({ provider: 'salesforce', providerConfigKey: 'salesforce', authMode: 'oauth2' });
    this.registerProvider({ provider: 'hubspot', providerConfigKey: 'hubspot', authMode: 'oauth2' });
    this.registerProvider({ provider: 'shopify', providerConfigKey: 'shopify', authMode: 'oauth2' });
    
    // Productivity providers
    this.registerProvider({ provider: 'notion', providerConfigKey: 'notion', authMode: 'oauth2' });
    this.registerProvider({ provider: 'jira', providerConfigKey: 'jira', authMode: 'oauth2' });
    this.registerProvider({ provider: 'asana', providerConfigKey: 'asana', authMode: 'oauth2' });
    this.registerProvider({ provider: 'slack', providerConfigKey: 'slack', authMode: 'oauth2' });
    
    console.log('[nango] Registered common OAuth providers');
  }
}

export const nangoService = new NangoService();