/**
 * Airbyte Integration Routes
 * 
 * This file contains the Express routes for the Airbyte integration,
 * allowing the frontend to interact with the Airbyte services.
 */

import { Router } from 'express';
import { storage } from '../storage';
import { log } from '../vite';
import type { Request, Response, NextFunction } from 'express';
import { AirbyteClient, AirbyteConfig, createAirbyteClient } from '../services/integrations/airbyte';
import { insertAirbyteSourceSchema, insertAirbyteDestinationSchema, insertAirbyteConnectionSchema, insertAirbyteSyncJobSchema } from '@shared/schema';
import { z } from 'zod';

// Authentication middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

const router = Router();

// Cache for Airbyte clients to avoid creating new ones for each request
const airbyteClients = new Map<number, AirbyteClient>();

/**
 * Get Airbyte client for a user
 * 
 * @param userId User ID
 * @returns Airbyte client or null if not configured
 */
async function getAirbyteClient(userId: number): Promise<AirbyteClient | null> {
  // Check if we already have a cached client
  if (airbyteClients.has(userId)) {
    return airbyteClients.get(userId)!;
  }

  try {
    // Get user's Airbyte config
    const config = await storage.getAirbyteConfig(userId);
    
    if (!config) {
      return null;
    }

    // Create new Airbyte client
    const client = createAirbyteClient(JSON.parse(config.configJson));
    
    // Cache the client
    airbyteClients.set(userId, client);
    
    return client;
  } catch (error: any) {
    log(`Error getting Airbyte client: ${error.message}`, 'error');
    return null;
  }
}

// Test Airbyte connection
router.post('/test-connection', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ message: 'Invalid configuration provided' });
    }
    
    // Create temporary client for testing
    const client = createAirbyteClient(config as AirbyteConfig);
    
    // Test the connection
    const success = await client.testConnection();
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ message: 'Failed to connect to Airbyte API' });
    }
  } catch (error: any) {
    log(`Error testing Airbyte connection: ${error.message}`, 'error');
    res.status(500).json({ message: `Error testing connection: ${error.message}` });
  }
});

// Save Airbyte configuration
router.post('/save-config', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ message: 'Invalid configuration provided' });
    }
    
    // Validate by creating a client
    const client = createAirbyteClient(config as AirbyteConfig);
    
    // Test the connection
    const success = await client.testConnection();
    
    if (!success) {
      return res.status(400).json({ message: 'Configuration validation failed' });
    }
    
    // Save configuration to database
    await storage.saveAirbyteConfig(user.id, {
      userId: user.id,
      configJson: JSON.stringify(config),
    });
    
    // Update cached client
    airbyteClients.set(user.id, client);
    
    res.json({ success: true });
  } catch (error: any) {
    log(`Error saving Airbyte configuration: ${error.message}`, 'error');
    res.status(500).json({ message: `Error saving configuration: ${error.message}` });
  }
});

// Get Airbyte sources
router.get('/sources', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Get sources from database
    const sources = await storage.getAirbyteSources(user.id);
    
    res.json(sources);
  } catch (error: any) {
    log(`Error fetching Airbyte sources: ${error.message}`, 'error');
    res.status(500).json({ message: `Error fetching sources: ${error.message}` });
  }
});

// Create Airbyte source
router.post('/sources', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Validate request body
    const validatedData = insertAirbyteSourceSchema.parse(req.body);
    
    // Get Airbyte client
    const client = await getAirbyteClient(user.id);
    
    if (!client) {
      return res.status(400).json({ message: 'Airbyte is not configured' });
    }
    
    // Create source in Airbyte
    const sourceResult = await client.createSource(
      validatedData.name,
      validatedData.sourceDefinitionId,
      validatedData.connectionConfiguration
    );
    
    // Save source to database
    const source = await storage.createAirbyteSource({
      userId: user.id,
      sourceId: sourceResult.sourceId,
      sourceDefinitionId: validatedData.sourceDefinitionId,
      name: validatedData.name,
      connectionConfiguration: validatedData.connectionConfiguration,
      workspaceId: validatedData.workspaceId,
    });
    
    res.status(201).json(source);
  } catch (error: any) {
    log(`Error creating Airbyte source: ${error.message}`, 'error');
    res.status(500).json({ message: `Error creating source: ${error.message}` });
  }
});

// Get Airbyte destinations
router.get('/destinations', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Get destinations from database
    const destinations = await storage.getAirbyteDestinations(user.id);
    
    res.json(destinations);
  } catch (error: any) {
    log(`Error fetching Airbyte destinations: ${error.message}`, 'error');
    res.status(500).json({ message: `Error fetching destinations: ${error.message}` });
  }
});

// Create Airbyte destination
router.post('/destinations', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Validate request body
    const validatedData = insertAirbyteDestinationSchema.parse(req.body);
    
    // Get Airbyte client
    const client = await getAirbyteClient(user.id);
    
    if (!client) {
      return res.status(400).json({ message: 'Airbyte is not configured' });
    }
    
    // Create destination in Airbyte
    const destinationResult = await client.createDestination(
      validatedData.name,
      validatedData.destinationDefinitionId,
      validatedData.connectionConfiguration
    );
    
    // Save destination to database
    const destination = await storage.createAirbyteDestination({
      userId: user.id,
      destinationId: destinationResult.destinationId,
      destinationDefinitionId: validatedData.destinationDefinitionId,
      name: validatedData.name,
      connectionConfiguration: validatedData.connectionConfiguration,
      workspaceId: validatedData.workspaceId,
    });
    
    res.status(201).json(destination);
  } catch (error: any) {
    log(`Error creating Airbyte destination: ${error.message}`, 'error');
    res.status(500).json({ message: `Error creating destination: ${error.message}` });
  }
});

// Get Airbyte connections
router.get('/connections', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Get connections from database
    const connections = await storage.getAirbyteConnections(user.id);
    
    res.json(connections);
  } catch (error: any) {
    log(`Error fetching Airbyte connections: ${error.message}`, 'error');
    res.status(500).json({ message: `Error fetching connections: ${error.message}` });
  }
});

// Create Airbyte connection
router.post('/connections', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Validate request body
    const validatedData = insertAirbyteConnectionSchema.parse(req.body);
    
    // Get Airbyte client
    const client = await getAirbyteClient(user.id);
    
    if (!client) {
      return res.status(400).json({ message: 'Airbyte is not configured' });
    }
    
    // Get source and destination from database
    const source = await storage.getAirbyteSource(validatedData.sourceId);
    const destination = await storage.getAirbyteDestination(validatedData.destinationId);
    
    if (!source || !destination) {
      return res.status(400).json({ message: 'Invalid source or destination' });
    }
    
    // Create connection in Airbyte
    const connectionResult = await client.createConnection(
      source.sourceId,
      destination.destinationId,
      validatedData.name,
      validatedData.syncCatalog,
      validatedData.schedule as any
    );
    
    // Save connection to database
    const connection = await storage.createAirbyteConnection({
      userId: user.id,
      connectionId: connectionResult.connectionId,
      sourceId: source.id,
      destinationId: destination.id,
      name: validatedData.name,
      syncCatalog: validatedData.syncCatalog,
      status: validatedData.status,
      schedule: validatedData.schedule,
    });
    
    res.status(201).json(connection);
  } catch (error: any) {
    log(`Error creating Airbyte connection: ${error.message}`, 'error');
    res.status(500).json({ message: `Error creating connection: ${error.message}` });
  }
});

// Trigger synchronization
router.post('/trigger-sync/:connectionId', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const connectionId = parseInt(req.params.connectionId);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({ message: 'Invalid connection ID' });
    }
    
    // Get connection from database
    const connection = await storage.getAirbyteConnection(connectionId);
    
    if (!connection || connection.userId !== user.id) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    
    // Get Airbyte client
    const client = await getAirbyteClient(user.id);
    
    if (!client) {
      return res.status(400).json({ message: 'Airbyte is not configured' });
    }
    
    // Trigger sync in Airbyte
    const syncResult = await client.triggerSync(connection.connectionId);
    
    // Save sync job to database
    const job = await storage.createAirbyteSyncJob({
      userId: user.id,
      connectionId: connection.id,
      jobId: syncResult.jobId,
      status: 'pending',
    });
    
    res.json(job);
  } catch (error: any) {
    log(`Error triggering Airbyte sync: ${error.message}`, 'error');
    res.status(500).json({ message: `Error triggering sync: ${error.message}` });
  }
});

// Get synchronization jobs
router.get('/sync-jobs', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    
    // Get sync jobs from database
    const jobs = await storage.getAirbyteSyncJobs(user.id);
    
    res.json(jobs);
  } catch (error: any) {
    log(`Error fetching Airbyte sync jobs: ${error.message}`, 'error');
    res.status(500).json({ message: `Error fetching sync jobs: ${error.message}` });
  }
});

// Get synchronization job status
router.get('/sync-jobs/:id', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const jobId = parseInt(req.params.id);
    
    if (isNaN(jobId)) {
      return res.status(400).json({ message: 'Invalid job ID' });
    }
    
    // Get sync job from database
    const job = await storage.getAirbyteSyncJob(jobId);
    
    if (!job || job.userId !== user.id) {
      return res.status(404).json({ message: 'Job not found' });
    }
    
    // If job is already completed, just return it
    if (job.status !== 'pending' && job.status !== 'running') {
      return res.json(job);
    }
    
    // Get Airbyte client
    const client = await getAirbyteClient(user.id);
    
    if (!client || !job.jobId) {
      return res.json(job);
    }
    
    // Get job status from Airbyte
    const jobStatus = await client.getSyncStatus(job.jobId);
    
    // Update job in database if status has changed
    if (jobStatus && jobStatus.status !== job.status) {
      const updatedJob = await storage.updateAirbyteSyncJob(job.id, {
        status: jobStatus.status,
        startTime: jobStatus.startTime,
        endTime: jobStatus.endTime,
        bytesSynced: jobStatus.bytesSynced,
        recordsSynced: jobStatus.recordsSynced,
      });
      
      return res.json(updatedJob);
    }
    
    res.json(job);
  } catch (error: any) {
    log(`Error fetching Airbyte sync job status: ${error.message}`, 'error');
    res.status(500).json({ message: `Error fetching job status: ${error.message}` });
  }
});

export default router;