/**
 * Vector Database Routes
 * 
 * This file contains the API routes for Supavec vector database functionality.
 */

import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/auth';
import { supavecService, VectorDbType } from '../services/vector-db/supavec';
import { db } from '../db';
import { vectorCollections } from '@shared/schema';

const router = Router();

// Status endpoint to check the service
router.get('/status', async (req, res) => {
  try {
    const isAvailable = supavecService.isAvailable();
    
    res.json({
      status: isAvailable ? 'operational' : 'unavailable',
      version: 'v1.0.0',
      features: {
        vectorSearch: true,
        textSearch: true,
        hybridSearch: true,
        collectionManagement: true
      },
      databases: {
        pgvector: true,
        pinecone: true,
        chroma: true,
        faiss: true,
        milvus: true
      }
    });
  } catch (error) {
    console.error('Error checking vector DB status:', error);
    res.status(500).json({ error: 'Failed to get vector DB status' });
  }
});

// Create a new vector database
router.post('/databases', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      type: z.nativeEnum(VectorDbType),
      config: z.record(z.any()),
      description: z.string().optional(),
      isDefault: z.boolean().optional()
    });
    
    const { name, type, config, description, isDefault } = schema.parse(req.body);
    
    const db = await supavecService.createVectorDatabase(
      user,
      name,
      type,
      config,
      description,
      isDefault
    );
    
    res.status(201).json(db);
  } catch (error) {
    console.error('Error creating vector database:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to create vector database' });
  }
});

// Get all vector databases
router.get('/databases', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const databases = await supavecService.getVectorDatabases(user);
    res.json(databases);
  } catch (error) {
    console.error('Error fetching vector databases:', error);
    res.status(500).json({ error: 'Failed to fetch vector databases' });
  }
});

// Get all collections across databases (for LangChain integration)
router.get('/collections', async (req, res) => {
  try {
    // For now, implement a simplified version that works without requiring auth
    // This makes it easier for the LangChain integration to retrieve collections
    
    // Get collections from the database directly
    const collections = await db.select()
      .from(vectorCollections);
    
    // Format collections for the frontend
    const formattedCollections = collections.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description || '',
      itemCount: collection.itemCount,
      dimensions: collection.dimensions
    }));
    
    res.json(formattedCollections);
  } catch (error) {
    console.error('Error fetching all vector collections:', error);
    res.status(500).json({ error: 'Failed to fetch vector collections' });
  }
});

// Get a specific vector database
router.get('/databases/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    const database = await supavecService.getVectorDatabase(parseInt(id), user);
    res.json(database);
  } catch (error) {
    console.error('Error fetching vector database:', error);
    res.status(500).json({ error: 'Failed to fetch vector database' });
  }
});

// Update a vector database
router.put('/databases/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      name: z.string().min(1, 'Name is required').optional(),
      config: z.record(z.any()).optional(),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
      isDefault: z.boolean().optional()
    });
    
    const data = schema.parse(req.body);
    
    const updated = await supavecService.updateVectorDatabase(
      parseInt(id),
      user,
      data
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating vector database:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to update vector database' });
  }
});

// Delete a vector database
router.delete('/databases/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    await supavecService.deleteVectorDatabase(parseInt(id), user);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vector database:', error);
    res.status(500).json({ error: 'Failed to delete vector database' });
  }
});

// Create a collection
router.post('/databases/:dbId/collections', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { dbId } = req.params;
    
    const schema = z.object({
      name: z.string().min(1, 'Name is required'),
      description: z.string().optional(),
      dimensions: z.number().int().positive().optional(),
      metadata: z.record(z.any()).optional()
    });
    
    const data = schema.parse(req.body);
    
    const collection = await supavecService.createCollection(
      parseInt(dbId),
      user,
      data
    );
    
    res.status(201).json(collection);
  } catch (error) {
    console.error('Error creating vector collection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to create vector collection' });
  }
});

// Get all collections for a database
router.get('/databases/:dbId/collections', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { dbId } = req.params;
    
    const collections = await supavecService.getCollections(parseInt(dbId), user);
    
    res.json(collections);
  } catch (error) {
    console.error('Error fetching vector collections:', error);
    res.status(500).json({ error: 'Failed to fetch vector collections' });
  }
});

// Get a specific collection
router.get('/collections/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const collection = await supavecService.getCollection(parseInt(id), user);
    
    res.json(collection);
  } catch (error) {
    console.error('Error fetching vector collection:', error);
    res.status(500).json({ error: 'Failed to fetch vector collection' });
  }
});

// Update a collection
router.put('/collections/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      name: z.string().min(1, 'Name is required').optional(),
      description: z.string().optional(),
      metadata: z.record(z.any()).optional()
    });
    
    const data = schema.parse(req.body);
    
    const updated = await supavecService.updateCollection(
      parseInt(id),
      user,
      data
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating vector collection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to update vector collection' });
  }
});

// Delete a collection
router.delete('/collections/:id', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    await supavecService.deleteCollection(parseInt(id), user);
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting vector collection:', error);
    res.status(500).json({ error: 'Failed to delete vector collection' });
  }
});

// Add items to a collection
router.post('/collections/:id/items', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      items: z.array(
        z.object({
          objectId: z.string(),
          objectType: z.string(),
          embedding: z.array(z.number()).optional(),
          content: z.string().optional(),
          metadata: z.record(z.any()).optional(),
          title: z.string().optional(),
          chunkSize: z.number().int().positive().optional(),
          chunkOverlap: z.number().int().min(0).optional()
        })
      )
    });
    
    const { items } = schema.parse(req.body);
    
    const insertedItems = await supavecService.addItems(
      parseInt(id),
      user,
      items
    );
    
    res.status(201).json(insertedItems);
  } catch (error) {
    console.error('Error adding items to vector collection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to add items to vector collection' });
  }
});

// Search by vector
router.post('/collections/:id/search/vector', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      vector: z.array(z.number()),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
      includeMetadata: z.boolean().optional(),
      includeEmbedding: z.boolean().optional(),
      filter: z.record(z.any()).optional(),
      scoreCutoff: z.number().min(0).max(1).optional(),
      withScores: z.boolean().optional()
    });
    
    const { vector, ...options } = schema.parse(req.body);
    
    const results = await supavecService.searchByVector(
      parseInt(id),
      user,
      vector,
      options
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error searching vector collection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to search vector collection' });
  }
});

// Search by text
router.post('/collections/:id/search/text', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      text: z.string().min(1, 'Search text is required'),
      limit: z.number().int().positive().optional(),
      offset: z.number().int().min(0).optional(),
      includeMetadata: z.boolean().optional(),
      includeEmbedding: z.boolean().optional(),
      filter: z.record(z.any()).optional(),
      scoreCutoff: z.number().min(0).max(1).optional(),
      withScores: z.boolean().optional()
    });
    
    const { text, ...options } = schema.parse(req.body);
    
    const results = await supavecService.searchByText(
      parseInt(id),
      user,
      text,
      options
    );
    
    res.json(results);
  } catch (error) {
    console.error('Error searching vector collection by text:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to search vector collection by text' });
  }
});

// Delete items from a collection
router.delete('/collections/:id/items', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    const { id } = req.params;
    
    const schema = z.object({
      itemIds: z.array(z.number().int().positive())
    });
    
    const { itemIds } = schema.parse(req.body);
    
    await supavecService.deleteItems(
      parseInt(id),
      user,
      itemIds
    );
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting items from vector collection:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to delete items from vector collection' });
  }
});

// Migrate data between vector databases
router.post('/migrate', isAuthenticated, async (req, res) => {
  try {
    const user = (req.user as any).id;
    
    const schema = z.object({
      sourceDbId: z.number().int().positive(),
      targetDbId: z.number().int().positive(),
      sourceColl: z.number().int().positive().optional(),
      targetColl: z.number().int().positive().optional()
    });
    
    const { sourceDbId, targetDbId, sourceColl, targetColl } = schema.parse(req.body);
    
    const result = await supavecService.migrateData(
      sourceDbId,
      targetDbId,
      user,
      { sourceColl, targetColl }
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error migrating vector data:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: error.errors
      });
    }
    
    res.status(500).json({ error: 'Failed to migrate vector data' });
  }
});

export default router;