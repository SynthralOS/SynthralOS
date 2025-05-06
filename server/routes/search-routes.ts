/**
 * Search Routes
 * 
 * API endpoints for searching across various entity types
 * and managing saved searches
 */

import { Router, Request, Response } from 'express';
import { searchService, SearchFilters } from '../services/search';
import { logError, logInfo } from '../services/activity-logger';
import { EntityType } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

/**
 * Basic keyword search across all content types
 */
router.get('/api/search', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { 
      q = '', 
      types = '', 
      tags = '',
      from, 
      to, 
      status,
      sort = 'createdAt',
      direction = 'desc',
      page = '1',
      limit = '20'
    } = req.query as Record<string, string>;

    // Build filters from query params
    const filters: SearchFilters = {
      userId: (req.user as any).id,
      types: types ? types.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      status: status,
      sortBy: sort,
      sortDirection: direction as 'asc' | 'desc'
    };

    const results = await searchService.basicSearch(
      q, 
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    logInfo(
      'search_performed',
      { query: q, filters, resultsCount: results.total },
      (req.user as any).id,
      undefined,
      undefined,
      req
    );

    res.status(200).json(results);
  } catch (error) {
    logError(
      'search_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );

    res.status(500).json({ 
      message: 'Error performing search',
      error: error.message
    });
  }
});

/**
 * Semantic search using vector embeddings
 */
router.get('/api/semantic-search', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { 
      q = '', 
      types = '', 
      tags = '',
      from, 
      to, 
      status,
      page = '1',
      limit = '20'
    } = req.query as Record<string, string>;

    // Build filters from query params
    const filters: SearchFilters = {
      userId: (req.user as any).id,
      types: types ? types.split(',') : undefined,
      tags: tags ? tags.split(',') : undefined,
      fromDate: from ? new Date(from) : undefined,
      toDate: to ? new Date(to) : undefined,
      status: status
    };

    // Check if we have an OpenAI API key for embeddings
    if (!process.env.OPENAI_API_KEY) {
      return res.status(400).json({ 
        message: 'Semantic search is not available because OpenAI API key is not configured',
        fallbackResults: await searchService.basicSearch(q, filters, parseInt(page), parseInt(limit))
      });
    }

    const results = await searchService.semanticSearch(
      q, 
      filters, 
      parseInt(page), 
      parseInt(limit)
    );

    logInfo(
      'semantic_search_performed',
      { query: q, filters, resultsCount: results.total },
      (req.user as any).id,
      undefined,
      undefined,
      req
    );

    res.status(200).json(results);
  } catch (error) {
    logError(
      'semantic_search_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );

    // Fall back to regular search
    try {
      const { 
        q = '', 
        types = '', 
        tags = '',
        from, 
        to, 
        status,
        page = '1',
        limit = '20'
      } = req.query as Record<string, string>;
  
      // Build filters from query params
      const filters: SearchFilters = {
        userId: (req.user as any).id,
        types: types ? types.split(',') : undefined,
        tags: tags ? tags.split(',') : undefined,
        fromDate: from ? new Date(from) : undefined,
        toDate: to ? new Date(to) : undefined,
        status: status
      };
  
      const fallbackResults = await searchService.basicSearch(
        q, 
        filters, 
        parseInt(page), 
        parseInt(limit)
      );
  
      res.status(200).json({
        message: 'Semantic search failed, falling back to basic search',
        error: error.message,
        ...fallbackResults
      });
    } catch (fallbackError) {
      res.status(500).json({ 
        message: 'Error performing search',
        error: error.message
      });
    }
  }
});

/**
 * Save a search for later use
 */
const saveSearchSchema = z.object({
  name: z.string().min(1, "Name is required"),
  query: z.string(),
  filters: z.record(z.any()).optional(),
  entityType: z.string().min(1, "Entity type is required")
});

router.post('/api/search/save', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = saveSearchSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.flatten().fieldErrors
      });
    }
    
    const { name, query, filters, entityType } = validation.data;
    
    const savedSearch = await searchService.saveSearch(
      (req.user as any).id,
      name,
      query,
      filters || {},
      entityType
    );
    
    logInfo(
      'search_saved',
      { name, query, entityType },
      (req.user as any).id,
      undefined,
      undefined,
      req
    );
    
    res.status(201).json(savedSearch);
  } catch (error) {
    logError(
      'save_search_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({ 
      message: 'Error saving search',
      error: error.message
    });
  }
});

/**
 * Get saved searches for the current user
 */
router.get('/api/search/saved', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    
    const savedSearches = await searchService.getSavedSearches(
      (req.user as any).id,
      type as string
    );
    
    res.status(200).json(savedSearches);
  } catch (error) {
    logError(
      'get_saved_searches_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({ 
      message: 'Error retrieving saved searches',
      error: error.message
    });
  }
});

export default router;