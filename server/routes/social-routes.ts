import { Router } from 'express';
import { z } from 'zod';
import { SocialMonitoringService } from '../services/social/SocialMonitoringService';
import { insertSocialConnectorSchema, insertSocialMonitorSchema } from '@shared/schema';

// Extend the Request interface to include userId
declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
  }
}

// Create the router
const router = Router();

// Initialize a map to store per-user services
const userServices = new Map<number, SocialMonitoringService>();

// Middleware to get/initialize the appropriate social monitoring service
const getSocialMonitoringService = async (req: any, res: any, next: any) => {
  try {
    // Get the authenticated user's ID from the user object
    const user = req.user as any;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = user.id;

    // Check if service exists for this user, if not create it
    if (!userServices.has(userId)) {
      const service = new SocialMonitoringService(userId);
      await service.initialize();
      userServices.set(userId, service);
    }

    // Attach to request
    req.socialMonitorService = userServices.get(userId);
    next();
  } catch (error) {
    console.error('Error initializing social monitoring service:', error);
    res.status(500).json({ error: 'Failed to initialize monitoring service' });
  }
};

// Apply middlewares to all routes
// Authentication will be handled by the main router
router.use((req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
});
router.use(getSocialMonitoringService);

// Get all social connectors for the user
router.get('/connectors', async (req: any, res: any) => {
  try {
    const connectors = await req.socialMonitorService.getConnectors();
    
    // Transform to hide sensitive data
    const sanitizedConnectors = connectors.map((c: any) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      isActive: c.isActive,
      createdAt: c.createdAt,
      // Include only public credential fields for UI display
      apiKeyProvided: Boolean(c.credentials?.apiKey),
      accessTokenProvided: Boolean(c.credentials?.accessToken),
      bearerTokenProvided: Boolean(c.credentials?.bearerToken),
      clientIdProvided: Boolean(c.credentials?.clientId)
    }));
    
    res.json(sanitizedConnectors);
  } catch (error) {
    console.error('Error getting social connectors:', error);
    res.status(500).json({ error: 'Failed to get social connectors' });
  }
});

// Create a new social connector
router.post('/connectors', async (req: any, res: any) => {
  try {
    const user = req.user as any;
    // Validate the request
    const validatedData = insertSocialConnectorSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    // Create connector
    const connector = await req.socialMonitorService.createConnector(
      validatedData.platform,
      validatedData.name,
      validatedData.credentials || {}
    );
    
    // Return a safe version of the data (no sensitive credentials)
    res.status(201).json({
      id: connector.id,
      platform: connector.platform,
      name: connector.name,
      isActive: connector.isActive,
      createdAt: connector.createdAt
    });
  } catch (error) {
    console.error('Error creating social connector:', error);
    res.status(400).json({ error: 'Failed to create social connector' });
  }
});

// Get a specific connector
router.get('/connectors/:id', async (req: any, res: any) => {
  try {
    const connector = await req.socialMonitorService.getConnector(parseInt(req.params.id));
    
    // Return a safe version of the data (no sensitive credentials)
    res.json({
      id: connector.id,
      platform: connector.getPlatform(),
      name: connector.getName(),
      isAuthenticated: await connector.isAuthenticated()
    });
  } catch (error) {
    console.error(`Error getting connector ${req.params.id}:`, error);
    res.status(404).json({ error: 'Connector not found or access denied' });
  }
});

// Delete a connector
router.delete('/connectors/:id', async (req: any, res: any) => {
  try {
    await req.socialMonitorService.deleteConnector(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting connector ${req.params.id}:`, error);
    res.status(404).json({ error: 'Connector not found or access denied' });
  }
});

// Search across platforms
router.post('/search', async (req: any, res: any) => {
  try {
    const { keywords, accounts, limit, sort, platforms } = req.body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ error: 'At least one keyword is required' });
    }
    
    const results = await req.socialMonitorService.search({
      keywords,
      accounts,
      limit: limit || 100,
      sort: sort || 'recent',
      platforms
    });
    
    res.json(results);
  } catch (error) {
    console.error('Error searching social platforms:', error);
    res.status(500).json({ error: 'Failed to search social platforms' });
  }
});

// Get all monitors
router.get('/monitors', async (req: any, res: any) => {
  try {
    const monitors = await req.socialMonitorService.getMonitors();
    res.json(monitors);
  } catch (error) {
    console.error('Error getting social monitors:', error);
    res.status(500).json({ error: 'Failed to get social monitors' });
  }
});

// Create a new monitor
router.post('/monitors', async (req: any, res: any) => {
  try {
    const user = req.user as any;
    // Validate the request
    const validatedData = insertSocialMonitorSchema.parse({
      ...req.body,
      userId: user.id
    });
    
    // Create monitor
    const monitor = await req.socialMonitorService.createMonitor(
      validatedData.name,
      validatedData.description || null,
      validatedData.platforms as string[],
      validatedData.keywords as string[],
      validatedData.accounts as string[] || null,
      validatedData.frequency,
      validatedData.alertThreshold || null
    );
    
    res.status(201).json(monitor);
  } catch (error) {
    console.error('Error creating social monitor:', error);
    res.status(400).json({ error: 'Failed to create social monitor' });
  }
});

// Get a specific monitor
router.get('/monitors/:id', async (req: any, res: any) => {
  try {
    const monitor = await req.socialMonitorService.getMonitor(parseInt(req.params.id));
    res.json(monitor);
  } catch (error) {
    console.error(`Error getting monitor ${req.params.id}:`, error);
    res.status(404).json({ error: 'Monitor not found or access denied' });
  }
});

// Update a monitor
router.patch('/monitors/:id', async (req: any, res: any) => {
  try {
    // Sanitize input (only allow updates to specific fields)
    const allowedUpdates = [
      'name', 'description', 'platforms', 'keywords', 
      'accounts', 'frequency', 'alertThreshold', 'isActive'
    ];
    
    const updates: Record<string, any> = Object.keys(req.body)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj: Record<string, any>, key: string) => {
        obj[key] = req.body[key];
        return obj;
      }, {});
    
    const updatedMonitor = await req.socialMonitorService.updateMonitor(
      parseInt(req.params.id),
      updates
    );
    
    res.json(updatedMonitor);
  } catch (error) {
    console.error(`Error updating monitor ${req.params.id}:`, error);
    res.status(404).json({ error: 'Monitor not found or access denied' });
  }
});

// Delete a monitor
router.delete('/monitors/:id', async (req: any, res: any) => {
  try {
    await req.socialMonitorService.deleteMonitor(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting monitor ${req.params.id}:`, error);
    res.status(404).json({ error: 'Monitor not found or access denied' });
  }
});

// Get monitor results
router.get('/monitors/:id/results', async (req: any, res: any) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const results = await req.socialMonitorService.getMonitorResults(
      parseInt(req.params.id),
      limit
    );
    
    res.json(results);
  } catch (error) {
    console.error(`Error getting results for monitor ${req.params.id}:`, error);
    res.status(404).json({ error: 'Monitor not found or access denied' });
  }
});

// Get monitor alerts
router.get('/monitors/:id/alerts', async (req: any, res: any) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;
    const alerts = await req.socialMonitorService.getMonitorAlerts(
      parseInt(req.params.id),
      limit
    );
    
    res.json(alerts);
  } catch (error) {
    console.error(`Error getting alerts for monitor ${req.params.id}:`, error);
    res.status(404).json({ error: 'Monitor not found or access denied' });
  }
});

// Mark an alert as read
router.patch('/alerts/:id/read', async (req: any, res: any) => {
  try {
    await req.socialMonitorService.markAlertRead(parseInt(req.params.id));
    res.status(204).send();
  } catch (error) {
    console.error(`Error marking alert ${req.params.id} as read:`, error);
    res.status(404).json({ error: 'Alert not found or access denied' });
  }
});

export default router;