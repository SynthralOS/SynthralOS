import axios from 'axios';
import { 
  OidcDiscoveryError, 
  OidcProviderError, 
  OidcStateError, 
  OidcTokenError, 
  OidcUserInfoError 
} from './error-handler';
import crypto from 'crypto';
import querystring from 'querystring';

export interface OidcProviderConfig {
  id: number;
  name: string;
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OidcDiscoveryResponse {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
  issuer: string;
  [key: string]: any;
}

export interface OidcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  [key: string]: any;
}

export interface OidcUserInfoResponse {
  sub: string;
  [key: string]: any;
}

export interface OidcCallbackParams {
  code?: string | string[];
  state?: string | string[];
  error?: string | string[];
  error_description?: string | string[];
}

export class OpenIDConnectService {
  private static async getDiscoveryDocument(issuerUrl: string): Promise<OidcDiscoveryResponse> {
    try {
      // Try standard well-known endpoint first
      const wellKnownUrl = issuerUrl.endsWith('/') 
        ? `${issuerUrl}.well-known/openid-configuration` 
        : `${issuerUrl}/.well-known/openid-configuration`;

      const response = await axios.get(wellKnownUrl);
      return response.data;
    } catch (error) {
      // If standard endpoint fails, try alternative endpoint format
      try {
        const alternativeUrl = issuerUrl.endsWith('/') 
          ? `${issuerUrl}oauth-authorization-server/.well-known/openid-configuration` 
          : `${issuerUrl}/oauth-authorization-server/.well-known/openid-configuration`;
          
        const response = await axios.get(alternativeUrl);
        return response.data;
      } catch (alternativeError) {
        // If both fail, throw a discovery error with details
        console.error("OIDC discovery error:", error);
        throw new OidcDiscoveryError('Failed to retrieve OIDC discovery document', {
          issuerUrl,
          originalError: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Generate state and nonce parameters for OIDC authorization request
   */
  public static generateAuthParams() {
    const state = crypto.randomBytes(32).toString('hex');
    const nonce = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(64).toString('hex');
    
    // Generate code challenge for PKCE
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
      
    return { state, nonce, codeVerifier, codeChallenge };
  }

  /**
   * Get the authorization URL for an OIDC provider
   */
  public static async getAuthorizationUrl(
    provider: OidcProviderConfig,
    state: string,
    nonce: string,
    codeChallenge?: string
  ): Promise<string> {
    if (!provider || !provider.issuerUrl) {
      throw new OidcProviderError('Invalid OIDC provider', { provider });
    }

    try {
      const discovery = await this.getDiscoveryDocument(provider.issuerUrl);
      
      if (!discovery.authorization_endpoint) {
        throw new OidcDiscoveryError('Authorization endpoint not found in discovery document');
      }

      // Base parameters for authorization request
      const params: Record<string, string> = {
        client_id: provider.clientId,
        redirect_uri: provider.redirectUri,
        response_type: 'code',
        scope: Array.isArray(provider.scopes) ? provider.scopes.join(' ') : 'openid profile email',
        state,
        nonce,
      };
      
      // Add PKCE parameters if code challenge is provided
      if (codeChallenge) {
        params.code_challenge = codeChallenge;
        params.code_challenge_method = 'S256';
      }

      const queryParams = querystring.stringify(params);
      return `${discovery.authorization_endpoint}?${queryParams}`;
    } catch (error) {
      if (error instanceof OidcDiscoveryError || error instanceof OidcProviderError) {
        throw error;
      }
      throw new OidcProviderError('Failed to generate authorization URL', {
        provider: provider.name,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle the callback from the OIDC provider
   */
  public static async handleCallback(
    provider: OidcProviderConfig,
    params: OidcCallbackParams,
    expectedState: string,
    expectedNonce: string,
    codeVerifier?: string
  ): Promise<OidcTokenResponse> {
    // Check for errors in the callback parameters
    if (params.error) {
      throw new OidcStateError(`Error during authorization: ${params.error}`, {
        error: params.error,
        error_description: params.error_description
      });
    }

    // Validate state to prevent CSRF
    if (!params.state || params.state !== expectedState) {
      throw new OidcStateError('Invalid state parameter', {
        expected: expectedState,
        received: params.state
      });
    }

    // Ensure code parameter is present
    if (!params.code) {
      throw new OidcStateError('Authorization code missing from callback');
    }

    try {
      // Get the token endpoint from discovery
      const discovery = await this.getDiscoveryDocument(provider.issuerUrl);
      
      if (!discovery.token_endpoint) {
        throw new OidcDiscoveryError('Token endpoint not found in discovery document');
      }

      // Prepare token request parameters
      const tokenParams: Record<string, string> = {
        grant_type: 'authorization_code',
        code: Array.isArray(params.code) ? params.code[0] : params.code,
        redirect_uri: provider.redirectUri,
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
      };
      
      // Add PKCE code verifier if provided
      if (codeVerifier) {
        tokenParams.code_verifier = codeVerifier;
      }

      // Exchange code for tokens
      const response = await axios.post(
        discovery.token_endpoint,
        querystring.stringify(tokenParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const tokenResponse = response.data as OidcTokenResponse;
      
      // Validate id_token if present
      if (tokenResponse.id_token) {
        // In a production-ready implementation, you would verify the signature and claims
        // of the ID token here
      }

      return tokenResponse;
    } catch (error) {
      // Handle specific errors
      if (error instanceof OidcDiscoveryError || error instanceof OidcStateError) {
        throw error;
      }
      
      // Create a detailed token error with the original error information
      const details = error.response?.data || {
        originalError: error instanceof Error ? error.message : String(error)
      };
      
      throw new OidcTokenError('Failed to exchange code for tokens', details);
    }
  }

  /**
   * Get user information from the OIDC provider
   */
  public static async getUserInfo(
    provider: OidcProviderConfig,
    accessToken: string
  ): Promise<OidcUserInfoResponse> {
    try {
      const discovery = await this.getDiscoveryDocument(provider.issuerUrl);
      
      if (!discovery.userinfo_endpoint) {
        throw new OidcDiscoveryError('Userinfo endpoint not found in discovery document');
      }

      const response = await axios.get(discovery.userinfo_endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (error instanceof OidcDiscoveryError) {
        throw error;
      }
      
      throw new OidcUserInfoError('Failed to get user info', {
        provider: provider.name,
        originalError: error instanceof Error ? error.message : String(error),
        responseData: error.response?.data,
      });
    }
  }

  /**
   * Convert OIDC provider and tokens to integration config
   */
  public static toIntegrationConfig(
    provider: OidcProviderConfig,
    tokenSet: OidcTokenResponse
  ): any {
    // Calculate expiry timestamp if expires_in is provided
    const expiryTimestamp = tokenSet.expires_in 
      ? Math.floor(Date.now() / 1000) + tokenSet.expires_in
      : undefined;
    
    return {
      name: provider.name,
      type: 'oauth2',
      authType: 'oauth2',
      tokenType: tokenSet.token_type || 'Bearer',
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: expiryTimestamp,
      scopes: provider.scopes,
      providerType: 'oidc',
      providerConfig: {
        issuerUrl: provider.issuerUrl,
        clientId: provider.clientId,
        tokenEndpoint: '',  // Will be populated from discovery
        authEndpoint: '',   // Will be populated from discovery
      }
    };
  }

  /**
   * Refresh an access token using a refresh token
   */
  public static async refreshAccessToken(
    provider: OidcProviderConfig,
    refreshToken: string
  ): Promise<OidcTokenResponse> {
    try {
      const discovery = await this.getDiscoveryDocument(provider.issuerUrl);
      
      if (!discovery.token_endpoint) {
        throw new OidcDiscoveryError('Token endpoint not found in discovery document');
      }

      const response = await axios.post(
        discovery.token_endpoint,
        querystring.stringify({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new OidcTokenError('Failed to refresh token', {
        provider: provider.name,
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}