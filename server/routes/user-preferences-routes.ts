/**
 * User Preferences Routes
 * 
 * API endpoints for managing user preferences and settings
 */

import { Router, Request, Response } from 'express';
import { 
  userPreferencesService, 
  DEFAULT_USER_PREFERENCES,
  SyncTarget
} from '../services/user-preferences';
import { logError } from '../services/activity-logger';
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
 * Get current user's preferences
 */
router.get('/api/user/preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const preferences = await userPreferencesService.getUserPreferences((req.user as any).id);
    
    if (!preferences) {
      return res.status(200).json(DEFAULT_USER_PREFERENCES);
    }
    
    res.status(200).json(preferences);
  } catch (error) {
    logError(
      'get_user_preferences_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving user preferences',
      error: error.message
    });
  }
});

/**
 * Save user preferences
 */
router.post('/api/user/preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const preferences = req.body;
    
    const savedPreferences = await userPreferencesService.saveUserPreferences(
      (req.user as any).id,
      preferences
    );
    
    res.status(200).json(savedPreferences);
  } catch (error) {
    logError(
      'save_user_preferences_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error saving user preferences',
      error: error.message
    });
  }
});

/**
 * Update a specific preference value
 */
const updatePreferenceSchema = z.object({
  key: z.string().min(1, "Preference key is required"),
  value: z.any()
});

router.patch('/api/user/preferences', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = updatePreferenceSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.flatten().fieldErrors
      });
    }
    
    const { key, value } = validation.data;
    
    const updatedPreferences = await userPreferencesService.updatePreference(
      (req.user as any).id,
      key,
      value
    );
    
    res.status(200).json(updatedPreferences);
  } catch (error) {
    logError(
      'update_preference_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error updating preference',
      error: error.message
    });
  }
});

/**
 * Reset user preferences to defaults
 */
router.post('/api/user/preferences/reset', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const resetPreferences = await userPreferencesService.resetPreferences(
      (req.user as any).id
    );
    
    res.status(200).json(resetPreferences);
  } catch (error) {
    logError(
      'reset_preferences_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error resetting preferences',
      error: error.message
    });
  }
});

/**
 * Get a specific preference value
 */
router.get('/api/user/preferences/:key', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { default: defaultValue } = req.query;
    
    const parsedDefault = defaultValue ? JSON.parse(defaultValue as string) : undefined;
    
    const value = await userPreferencesService.getPreference(
      (req.user as any).id,
      key,
      parsedDefault
    );
    
    res.status(200).json({ key, value });
  } catch (error) {
    logError(
      'get_preference_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving preference',
      error: error.message
    });
  }
});

/**
 * Register device/browser for preference sync
 */
const syncTargetSchema = z.object({
  type: z.enum(['browser', 'device', 'account']),
  identifier: z.string().min(1, "Device identifier is required"),
  name: z.string().min(1, "Device name is required")
});

router.post('/api/user/preferences/sync/register', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = syncTargetSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.flatten().fieldErrors
      });
    }
    
    const target: SyncTarget = validation.data;
    
    userPreferencesService.registerSyncTarget(
      (req.user as any).id,
      target
    );
    
    res.status(200).json({
      message: 'Sync target registered successfully',
      target
    });
  } catch (error) {
    logError(
      'register_sync_target_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error registering sync target',
      error: error.message
    });
  }
});

/**
 * Get all registered sync targets
 */
router.get('/api/user/preferences/sync/targets', isAuthenticated, (req: Request, res: Response) => {
  try {
    const targets = userPreferencesService.getSyncTargets((req.user as any).id);
    
    res.status(200).json(targets);
  } catch (error) {
    logError(
      'get_sync_targets_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error retrieving sync targets',
      error: error.message
    });
  }
});

/**
 * Unregister a sync target
 */
router.delete('/api/user/preferences/sync/targets/:identifier', isAuthenticated, (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    const success = userPreferencesService.unregisterSyncTarget(
      (req.user as any).id,
      identifier
    );
    
    if (!success) {
      return res.status(404).json({
        message: 'Sync target not found'
      });
    }
    
    res.status(200).json({
      message: 'Sync target unregistered successfully'
    });
  } catch (error) {
    logError(
      'unregister_sync_target_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error unregistering sync target',
      error: error.message
    });
  }
});

/**
 * Synchronize preferences between devices
 */
const syncPreferencesSchema = z.object({
  sourceIdentifier: z.string().min(1, "Source identifier is required"),
  targetIdentifier: z.string().min(1, "Target identifier is required"),
  preferenceGroups: z.array(z.string()).optional(),
  conflictResolution: z.enum(['newest', 'oldest', 'source', 'target']).optional()
});

router.post('/api/user/preferences/sync', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validation = syncPreferencesSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request',
        errors: validation.error.flatten().fieldErrors
      });
    }
    
    const { 
      sourceIdentifier, 
      targetIdentifier, 
      preferenceGroups, 
      conflictResolution 
    } = validation.data;
    
    const result = await userPreferencesService.syncPreferences(
      (req.user as any).id,
      sourceIdentifier,
      targetIdentifier,
      preferenceGroups,
      conflictResolution
    );
    
    res.status(200).json(result);
  } catch (error) {
    logError(
      'sync_preferences_error',
      error,
      (req.user as any)?.id,
      undefined,
      undefined,
      req
    );
    
    res.status(500).json({
      message: 'Error synchronizing preferences',
      error: error.message
    });
  }
});

export default router;