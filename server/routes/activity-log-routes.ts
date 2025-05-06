/**
 * Activity Log Routes
 * 
 * API endpoints for retrieving and managing activity logs
 */

import { Router, Request, Response } from 'express';
import { activityLogger, logError } from '../services/activity-logger';
import { EntityType, LogLevel } from '@shared/schema';
import { z } from 'zod';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  next();
};

// Middleware to check if user is admin
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated() || (req.user as any)?.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

/**
 * Get activity logs with filtering options (admin only)
 */
router.get('/api/activity-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    const {
      userId,
      level,
      action,
      entityType,
      entityId,
      from,
      to,
      limit = '100',
      offset = '0'
    } = req.query as Record<string, string>;

    const logs = await activityLogger.getActivityLogs({
      userId: userId ? parseInt(userId) : undefined,
      level: level as LogLevel | undefined,
      action,
      entityType: entityType as EntityType | undefined,
      entityId,
      startDate: from ? new Date(from) : undefined,
      endDate: to ? new Date(to) : undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.status(200).json(logs);
  } catch (error) {
    logError(
      'get_activity_logs_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );

    res.status(500).json({
      message: 'Error retrieving activity logs',
      error: error.message
    });
  }
});

/**
 * Get current user's activity logs
 */
router.get('/api/my-activity', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;
    
    const logs = await activityLogger.getUserActivity(
      (req.user as any).id,
      parseInt(limit as string)
    );
    
    res.status(200).json(logs);
  } catch (error) {
    logError(
      'get_user_activity_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving your activity logs',
      error: error.message
    });
  }
});

/**
 * Get activity logs for an entity
 */
router.get('/api/entity-activity/:type/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    const { limit = '10' } = req.query;
    
    const entityType = type as EntityType;
    
    // Only admins can see system logs
    if (entityType === EntityType.System && (req.user as any)?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const logs = await activityLogger.getEntityActivity(
      entityType,
      id,
      parseInt(limit as string)
    );
    
    res.status(200).json(logs);
  } catch (error) {
    logError(
      'get_entity_activity_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving entity activity logs',
      error: error.message
    });
  }
});

/**
 * Get system activity logs (admin only)
 */
router.get('/api/system-activity', isAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    
    const logs = await activityLogger.getSystemActivity(parseInt(limit as string));
    
    res.status(200).json(logs);
  } catch (error) {
    logError(
      'get_system_activity_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving system activity logs',
      error: error.message
    });
  }
});

/**
 * Get error logs (admin only)
 */
router.get('/api/error-logs', isAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    
    const logs = await activityLogger.getErrorLogs(parseInt(limit as string));
    
    res.status(200).json(logs);
  } catch (error) {
    logError(
      'get_error_logs_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving error logs',
      error: error.message
    });
  }
});

export default router;