import { Router } from 'express';
import { z } from 'zod';
import { nangoService } from '../services/integrations/nango';
import { storage } from '../storage';
import { OAuthConnectionStatus, insertOAuthConnectionSchema } from '@shared/schema';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Initialize Nango service with API keys from environment
// These should be set in the .env file or environment variables
function initializeNangoService() {
  if (!process.env.NANGO_SECRET_KEY || !process.env.NANGO_PUBLIC_KEY) {
    console.error('Nango API keys not found in environment variables. OAuth features will not work properly.');
    return false;
  }

  return nangoService.initialize({
    secretKey: process.env.NANGO_SECRET_KEY,
    publicKey: process.env.NANGO_PUBLIC_KEY,
    hostUrl: process.env.HOST_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`
  });
}

// When the application starts, initialize the Nango service
(async () => {
  initializeNangoService();
  // Register common providers (like GitHub, Google, Slack, etc.)
  nangoService.registerCommonProviders();
})();

// API endpoint to update Nango API keys securely
router.post('/config/nango', isAuthenticated, async (req, res) => {
  try {
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Ensure the user is an admin (you might want to add an admin check here)
    // For now, we're just checking if the user is authenticated
    
    // Validate the request body
    const configSchema = z.object({
      secretKey: z.string().min(1),
      publicKey: z.string().min(1),
      hostUrl: z.string().optional()
    });
    
    const { secretKey, publicKey, hostUrl } = configSchema.parse(req.body);
    
    // Set environment variables in memory (not persistent across restarts)
    process.env.NANGO_SECRET_KEY = secretKey;
    process.env.NANGO_PUBLIC_KEY = publicKey;
    if (hostUrl) {
      process.env.HOST_URL = hostUrl;
    }
    
    // Initialize the Nango service with the new keys
    const result = nangoService.initialize({
      secretKey,
      publicKey,
      hostUrl: hostUrl || process.env.HOST_URL || `https://${process.env.REPLIT_DOMAINS?.split(',')[0]}`
    });
    
    if (!result) {
      return res.status(500).json({ success: false, message: 'Failed to initialize Nango service with provided keys' });
    }
    
    // Re-register providers after initialization
    nangoService.registerCommonProviders();
    
    res.json({ success: true, message: 'Nango API keys updated successfully' });
  } catch (error) {
    console.error('Error updating Nango API keys:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, message: 'Invalid input data', errors: error.errors });
    }
    
    res.status(500).json({ success: false, message: 'Failed to update Nango API keys' });
  }
});

// Get authentication URL for a specific provider
router.get('/auth-url/:provider', isAuthenticated, async (req, res) => {
  try {
    const { provider } = req.params;
    
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = (req.user as any).id;
    
    // Ensure the Nango service is initialized
    if (!nangoService.isInitialized()) {
      if (!initializeNangoService()) {
        return res.status(503).json({ 
          error: 'Nango service is not available. Please check if API keys are configured.' 
        });
      }
    }
    
    // Create a connection ID that identifies this specific user's connection to the provider
    const connectionId = `${provider}-${userId}`;
    
    // Get the authorization URL from Nango
    const redirectUrl = req.query.redirectUrl as string;
    const authUrl = await nangoService.getAuthorizationUrl(provider, connectionId, redirectUrl);
    
    if (!authUrl) {
      return res.status(400).json({ error: `Failed to get authorization URL for ${provider}` });
    }
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error getting OAuth auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Handle OAuth callback (this endpoint is called by Nango after a successful OAuth flow)
router.get('/callback', async (req, res) => {
  try {
    // Nango will redirect to this endpoint with a success or error parameter
    const { success, error, connectionId, provider } = req.query;
    
    if (error) {
      console.error(`OAuth error from Nango: ${error}`);
      return res.redirect(`/integrations?error=${encodeURIComponent(error as string)}`);
    }
    
    if (success === 'true' && connectionId && provider) {
      // Extract user ID from connection ID
      const connParts = (connectionId as string).split('-');
      if (connParts.length < 2) {
        return res.redirect('/integrations?error=Invalid connection ID format');
      }
      
      const userId = parseInt(connParts[1]);
      
      // Get connection details from Nango
      const connection = await nangoService.getConnection(provider as string, connectionId as string);
      
      if (!connection) {
        return res.redirect('/integrations?error=Failed to retrieve connection details');
      }
      
      // Check if a connection already exists for this user and provider
      const existingConnections = await storage.getOAuthConnectionsByProvider(userId, provider as string);
      let oauthConnection;
      
      if (existingConnections.length > 0) {
        // Update the existing connection
        oauthConnection = await storage.updateOAuthConnection(existingConnections[0].id, {
          connectionStatus: OAuthConnectionStatus.Connected as OAuthConnectionStatus,
          nangoConnectionId: connection.id,
          metadata: connection.metadata || {},
          tokenData: connection.credentials || {},
          lastConnectedAt: new Date(),
          expiresAt: connection.expires_at ? new Date(connection.expires_at) : null
        });
      } else {
        // Create a new connection record
        const connectionData = insertOAuthConnectionSchema.parse({
          userId,
          provider: provider as string,
          connectionId: connectionId as string,
          nangoConnectionId: connection.id,
          connectionStatus: OAuthConnectionStatus.Connected as OAuthConnectionStatus,
          metadata: connection.metadata || {},
          tokenData: connection.credentials || {},
          lastConnectedAt: new Date(),
          expiresAt: connection.expires_at ? new Date(connection.expires_at) : null
        });
        
        oauthConnection = await storage.createOAuthConnection(connectionData);
      }
      
      return res.redirect('/integrations?success=true');
    }
    
    res.redirect('/integrations?error=Invalid callback parameters');
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`/integrations?error=${encodeURIComponent('Failed to complete OAuth connection')}`);
  }
});

// List all OAuth connections for the authenticated user
router.get('/connections', isAuthenticated, async (req, res) => {
  try {
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const connections = await storage.getOAuthConnectionsByUser(userId);
    
    // Don't include sensitive token data in the response
    const sanitizedConnections = connections.map(conn => ({
      id: conn.id,
      provider: conn.provider,
      connectionId: conn.connectionId,
      connectionStatus: conn.connectionStatus,
      metadata: conn.metadata,
      lastConnectedAt: conn.lastConnectedAt,
      expiresAt: conn.expiresAt,
      createdAt: conn.createdAt
    }));
    
    res.json({ connections: sanitizedConnections });
  } catch (error) {
    console.error('Error listing OAuth connections:', error);
    res.status(500).json({ error: 'Failed to list OAuth connections' });
  }
});

// Get a specific connection
router.get('/connections/:id', isAuthenticated, async (req, res) => {
  try {
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const connectionId = parseInt(req.params.id);
    
    const connection = await storage.getOAuthConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Only allow access to user's own connections
    if (connection.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Don't include sensitive token data
    const sanitizedConnection = {
      id: connection.id,
      provider: connection.provider,
      connectionId: connection.connectionId,
      connectionStatus: connection.connectionStatus,
      metadata: connection.metadata,
      lastConnectedAt: connection.lastConnectedAt,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt
    };
    
    res.json(sanitizedConnection);
  } catch (error) {
    console.error('Error getting OAuth connection:', error);
    res.status(500).json({ error: 'Failed to get OAuth connection' });
  }
});

// Delete a connection
router.delete('/connections/:id', isAuthenticated, async (req, res) => {
  try {
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const connectionId = parseInt(req.params.id);
    
    const connection = await storage.getOAuthConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    // Only allow deletion of user's own connections
    if (connection.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete from Nango first
    await nangoService.deleteConnection(connection.provider, connection.connectionId);
    
    // Then delete from our database
    const deleted = await storage.deleteOAuthConnection(connectionId);
    
    if (!deleted) {
      return res.status(500).json({ error: 'Failed to delete connection' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting OAuth connection:', error);
    res.status(500).json({ error: 'Failed to delete OAuth connection' });
  }
});

// Make an API request through Nango (which handles token refresh automatically)
router.post('/request/:provider/:id', isAuthenticated, async (req, res) => {
  try {
    // Ensure user is available and authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const userId = (req.user as any).id;
    const { provider } = req.params;
    const connectionId = parseInt(req.params.id);
    
    // Schema for the request body
    const requestSchema = z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
      data: z.any().optional()
    });
    
    // Validate the request body
    const { endpoint, method, data } = requestSchema.parse(req.body);
    
    // Ensure the connection exists and belongs to the user
    const connection = await storage.getOAuthConnection(connectionId);
    
    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    if (connection.userId !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Make the API request through Nango
    const response = await nangoService.makeRequest(
      provider,
      connection.connectionId,
      endpoint,
      method,
      data
    );
    
    if (!response) {
      return res.status(500).json({ error: 'API request failed' });
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error making API request through OAuth:', error);
    res.status(500).json({ error: 'Failed to make API request' });
  }
});

export default router;