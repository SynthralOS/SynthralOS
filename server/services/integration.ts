import axios, { AxiosRequestConfig } from 'axios';
import { log } from '../vite';
import * as querystring from 'querystring';

// API integration types
export enum IntegrationType {
  REST = 'rest',
  GRAPHQL = 'graphql',
  SOAP = 'soap',
  WEBHOOK = 'webhook',
  OAUTH = 'oauth'
}

// Authentication types
export enum AuthType {
  NONE = 'none',
  API_KEY = 'api_key',
  BASIC = 'basic',
  BEARER = 'bearer',
  OAUTH1 = 'oauth1',
  OAUTH2 = 'oauth2',
  CUSTOM = 'custom'
}

// HTTP Methods
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

// Content Types
export enum ContentType {
  JSON = 'application/json',
  FORM = 'application/x-www-form-urlencoded',
  MULTIPART = 'multipart/form-data',
  XML = 'application/xml',
  TEXT = 'text/plain'
}

// Authentication configuration
export interface AuthConfig {
  type: AuthType;
  credentials?: Record<string, string>;
  oauth?: {
    clientId: string;
    clientSecret: string;
    accessToken?: string;
    refreshToken?: string;
    tokenUrl?: string;
    authorizationUrl?: string;
    scope?: string;
    expiresAt?: number;
  };
}

// API Integration configuration
export interface IntegrationConfig {
  name: string;
  type: IntegrationType;
  baseUrl: string;
  auth: AuthConfig;
  headers?: Record<string, string>;
  defaultParams?: Record<string, string>;
  timeout?: number;
  retries?: number;
  rateLimiting?: {
    enabled: boolean;
    requestsPerMinute?: number;
    concurrent?: number;
  };
  webhookConfig?: {
    endpoint: string;
    secret?: string;
    events?: string[];
  };
}

// API Request options
export interface ApiRequestOptions {
  endpoint: string;
  method?: HttpMethod;
  params?: Record<string, any>;
  data?: any;
  headers?: Record<string, string>;
  contentType?: ContentType;
  timeout?: number;
}

// API Response
export interface ApiResponse {
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  timing: {
    start: number;
    end: number;
    duration: number;
  };
}

/**
 * API Integration Service
 */
export class IntegrationService {
  
  /**
   * Execute an API request
   */
  public static async executeRequest(
    config: IntegrationConfig,
    options: ApiRequestOptions
  ): Promise<ApiResponse> {
    const startTime = Date.now();
    
    try {
      // Configure request
      const requestConfig: AxiosRequestConfig = {
        url: this.buildUrl(config.baseUrl, options.endpoint),
        method: options.method || HttpMethod.GET,
        headers: {
          ...this.getDefaultHeaders(options.contentType || ContentType.JSON),
          ...config.headers,
          ...options.headers
        },
        timeout: options.timeout || config.timeout || 30000,
        params: {
          ...config.defaultParams,
          ...options.params
        }
      };
      
      // Add authentication
      this.applyAuthentication(requestConfig, config.auth);
      
      // Add data if method is not GET
      if (options.method !== HttpMethod.GET && options.data) {
        if (options.contentType === ContentType.FORM) {
          requestConfig.data = querystring.stringify(options.data);
        } else {
          requestConfig.data = options.data;
        }
      }
      
      // Execute request
      const response = await axios(requestConfig);
      
      // Format response
      const endTime = Date.now();
      const apiResponse: ApiResponse = {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers as Record<string, string>,
        timing: {
          start: startTime,
          end: endTime,
          duration: endTime - startTime
        }
      };
      
      return apiResponse;
    } catch (error: any) {
      // Handle axios error
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const endTime = Date.now();
        return {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers as Record<string, string>,
          timing: {
            start: startTime,
            end: endTime,
            duration: endTime - startTime
          }
        };
      } else if (error.request) {
        // The request was made but no response was received
        log(`API request error: ${error.message}`, 'integration');
        throw new Error(`API request failed: ${error.message}`);
      } else {
        // Something happened in setting up the request
        log(`API configuration error: ${error.message}`, 'integration');
        throw new Error(`API configuration error: ${error.message}`);
      }
    }
  }
  
  /**
   * Execute a GraphQL request
   */
  public static async executeGraphQLRequest(
    config: IntegrationConfig,
    query: string,
    variables?: Record<string, any>,
    operationName?: string
  ): Promise<ApiResponse> {
    if (config.type !== IntegrationType.GRAPHQL) {
      throw new Error('Integration type must be GraphQL');
    }
    
    const options: ApiRequestOptions = {
      endpoint: '',
      method: HttpMethod.POST,
      data: {
        query,
        variables,
        operationName
      },
      contentType: ContentType.JSON
    };
    
    return this.executeRequest(config, options);
  }
  
  /**
   * Register a webhook endpoint
   */
  public static async registerWebhook(
    config: IntegrationConfig,
    endpoint: string,
    events: string[],
    secret?: string
  ): Promise<{ success: boolean; message: string; webhookId?: string }> {
    if (config.type !== IntegrationType.WEBHOOK) {
      throw new Error('Integration type must be Webhook');
    }
    
    // This is a simplified implementation
    // In a real app, you would make API calls to the service to register the webhook
    log(`Registering webhook for ${config.name} at ${endpoint}`, 'integration');
    
    // Mock successful registration
    return {
      success: true,
      message: 'Webhook registered successfully',
      webhookId: `wh_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  /**
   * Validate a webhook request
   */
  public static validateWebhookRequest(
    config: IntegrationConfig,
    payload: any,
    headers: Record<string, string>
  ): boolean {
    if (!config.webhookConfig || !config.webhookConfig.secret) {
      // No secret configured, can't validate
      return true;
    }
    
    // This is a simplified implementation
    // In a real app, you would validate signatures or other security mechanisms
    log(`Validating webhook for ${config.name}`, 'integration');
    
    // Mock validation
    return true;
  }
  
  /**
   * Build the full URL for a request
   */
  private static buildUrl(baseUrl: string, endpoint: string): string {
    // Remove trailing slash from baseUrl
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    
    // Remove leading slash from endpoint
    if (endpoint.startsWith('/')) {
      endpoint = endpoint.slice(1);
    }
    
    return `${baseUrl}/${endpoint}`;
  }
  
  /**
   * Get default headers based on content type
   */
  private static getDefaultHeaders(contentType: ContentType): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': contentType
    };
    
    return headers;
  }
  
  /**
   * Apply authentication to the request config
   */
  private static applyAuthentication(
    requestConfig: AxiosRequestConfig,
    auth: AuthConfig
  ): void {
    switch (auth.type) {
      case AuthType.NONE:
        // No authentication
        break;
      
      case AuthType.API_KEY:
        if (auth.credentials?.apiKey && auth.credentials?.apiKeyName) {
          // Check if API key should be in header or query params
          if (auth.credentials.in === 'header') {
            requestConfig.headers = requestConfig.headers || {};
            requestConfig.headers[auth.credentials.apiKeyName] = auth.credentials.apiKey;
          } else {
            requestConfig.params = requestConfig.params || {};
            requestConfig.params[auth.credentials.apiKeyName] = auth.credentials.apiKey;
          }
        }
        break;
      
      case AuthType.BASIC:
        if (auth.credentials?.username && auth.credentials?.password) {
          requestConfig.auth = {
            username: auth.credentials.username,
            password: auth.credentials.password
          };
        }
        break;
      
      case AuthType.BEARER:
        if (auth.credentials?.token) {
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers['Authorization'] = `Bearer ${auth.credentials.token}`;
        }
        break;
      
      case AuthType.OAUTH2:
        if (auth.oauth?.accessToken) {
          requestConfig.headers = requestConfig.headers || {};
          requestConfig.headers['Authorization'] = `Bearer ${auth.oauth.accessToken}`;
        }
        break;
      
      case AuthType.CUSTOM:
        // Apply custom headers or params
        if (auth.credentials) {
          Object.entries(auth.credentials).forEach(([key, value]) => {
            if (key.startsWith('header:')) {
              const headerName = key.substring(7);
              requestConfig.headers = requestConfig.headers || {};
              requestConfig.headers[headerName] = value;
            } else if (key.startsWith('param:')) {
              const paramName = key.substring(6);
              requestConfig.params = requestConfig.params || {};
              requestConfig.params[paramName] = value;
            }
          });
        }
        break;
      
      default:
        log(`Unsupported auth type: ${auth.type}`, 'integration');
    }
  }
  
  /**
   * Refresh OAuth2 token
   */
  public static async refreshOAuth2Token(
    config: IntegrationConfig
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number } | null> {
    if (config.auth.type !== AuthType.OAUTH2 || 
        !config.auth.oauth?.refreshToken || 
        !config.auth.oauth?.clientId || 
        !config.auth.oauth?.clientSecret || 
        !config.auth.oauth?.tokenUrl) {
      return null;
    }
    
    try {
      const response = await axios({
        method: 'POST',
        url: config.auth.oauth.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        data: querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: config.auth.oauth.refreshToken,
          client_id: config.auth.oauth.clientId,
          client_secret: config.auth.oauth.clientSecret
        })
      });
      
      const data = response.data;
      const expiresIn = data.expires_in || 3600;
      const expiresAt = Date.now() + expiresIn * 1000;
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || config.auth.oauth.refreshToken,
        expiresAt
      };
    } catch (error) {
      log(`Failed to refresh OAuth2 token: ${error}`, 'integration');
      return null;
    }
  }
}

/**
 * OAuth2 service for handling authorization flows
 */
export class OAuth2Service {
  /**
   * Generate OAuth2 authorization URL
   */
  public static getAuthorizationUrl(
    config: IntegrationConfig,
    redirectUri: string,
    state: string,
    scope?: string
  ): string | null {
    if (config.auth.type !== AuthType.OAUTH2 || 
        !config.auth.oauth?.clientId || 
        !config.auth.oauth?.authorizationUrl) {
      return null;
    }
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.auth.oauth.clientId,
      redirect_uri: redirectUri,
      state
    });
    
    if (scope || config.auth.oauth.scope) {
      params.append('scope', scope || config.auth.oauth.scope);
    }
    
    return `${config.auth.oauth.authorizationUrl}?${params.toString()}`;
  }
  
  /**
   * Exchange authorization code for tokens
   */
  public static async exchangeCodeForTokens(
    config: IntegrationConfig,
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number } | null> {
    if (config.auth.type !== AuthType.OAUTH2 || 
        !config.auth.oauth?.clientId || 
        !config.auth.oauth?.clientSecret || 
        !config.auth.oauth?.tokenUrl) {
      return null;
    }
    
    try {
      const response = await axios({
        method: 'POST',
        url: config.auth.oauth.tokenUrl,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        data: querystring.stringify({
          grant_type: 'authorization_code',
          code,
          client_id: config.auth.oauth.clientId,
          client_secret: config.auth.oauth.clientSecret,
          redirect_uri: redirectUri
        })
      });
      
      const data = response.data;
      const expiresIn = data.expires_in || 3600;
      const expiresAt = Date.now() + expiresIn * 1000;
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt
      };
    } catch (error) {
      log(`Failed to exchange code for token: ${error}`, 'integration');
      return null;
    }
  }
}