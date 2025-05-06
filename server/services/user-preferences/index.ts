/**
 * User Preferences Service
 * 
 * Manages user preferences and settings including:
 * - UI preferences (theme, density, language)
 * - Notification settings
 * - AI model settings
 * - Custom display settings
 */

import { db } from '../../db';
import { 
  userPreferences, 
  UserPreference, 
  InsertUserPreference 
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { activityLogger } from '../activity-logger';
import { EntityType, LogLevel } from '@shared/schema';

/**
 * Default settings to use when creating new user preferences
 */
export const DEFAULT_USER_PREFERENCES = {
  theme: 'system', // 'light', 'dark', 'system'
  uiDensity: 'comfortable', // 'comfortable', 'compact', 'spacious'
  timezone: 'UTC',
  dateFormat: 'MM/DD/YYYY',
  defaultLanguage: 'en',
  aiSettings: {
    defaultModel: 'gpt-4-turbo',
    temperature: 0.7,
    maxTokens: 2000,
    showReasoning: true,
    defaultTools: ['web-search', 'calculator'],
  },
  notificationSettings: {
    email: true,
    browser: true,
    desktop: false,
    mobile: false,
    executionCompleted: true,
    executionFailed: true,
    systemAlerts: true,
    marketingMessages: false
  },
  customization: {
    accentColor: '#6366f1', // default indigo accent
    fontFamily: 'Inter',
    fontSize: 'medium',
    borderRadius: 'medium',
    dashboardLayout: 'grid'
  }
};

/**
 * User Preferences Service
 */
// Preference sync types
export interface SyncTarget {
  type: 'browser' | 'device' | 'account';
  identifier: string;
  name: string;
  lastSyncTime?: Date;
}

export interface SyncConflict {
  key: string;
  sourceValue: any;
  targetValue: any;
  sourceDevice: SyncTarget;
  targetDevice: SyncTarget;
}

export interface SyncResult {
  success: boolean;
  conflicts?: SyncConflict[];
  syncedAt: Date;
  syncedPreferenceGroups: string[];
  syncedKeys: string[];
}

export class UserPreferencesService {
  // Track connected devices/browsers for each user
  private connectedDevices: Map<number, SyncTarget[]> = new Map();
  
  /**
   * Register a device or browser for preference sync
   */
  public registerSyncTarget(userId: number, target: SyncTarget): void {
    if (!this.connectedDevices.has(userId)) {
      this.connectedDevices.set(userId, []);
    }
    
    const devices = this.connectedDevices.get(userId)!;
    const existingDeviceIndex = devices.findIndex(
      d => d.type === target.type && d.identifier === target.identifier
    );
    
    if (existingDeviceIndex >= 0) {
      // Update existing device
      devices[existingDeviceIndex] = {
        ...target,
        lastSyncTime: new Date()
      };
    } else {
      // Add new device
      devices.push({
        ...target,
        lastSyncTime: new Date()
      });
    }
    
    activityLogger.logActivity({
      level: LogLevel.Info,
      action: 'register_sync_device',
      entityType: EntityType.User,
      entityId: userId.toString(),
      details: { target }
    });
  }
  
  /**
   * Get all registered sync targets for a user
   */
  public getSyncTargets(userId: number): SyncTarget[] {
    return this.connectedDevices.get(userId) || [];
  }
  
  /**
   * Unregister a sync target
   */
  public unregisterSyncTarget(userId: number, targetIdentifier: string): boolean {
    if (!this.connectedDevices.has(userId)) {
      return false;
    }
    
    const devices = this.connectedDevices.get(userId)!;
    const initialLength = devices.length;
    
    this.connectedDevices.set(
      userId,
      devices.filter(d => d.identifier !== targetIdentifier)
    );
    
    const removed = this.connectedDevices.get(userId)!.length < initialLength;
    
    if (removed) {
      activityLogger.logActivity({
        level: LogLevel.Info,
        action: 'unregister_sync_device',
        entityType: EntityType.User,
        entityId: userId.toString(),
        details: { targetIdentifier }
      });
    }
    
    return removed;
  }
  
  /**
   * Synchronize preferences across devices
   */
  public async syncPreferences(
    userId: number,
    sourceIdentifier: string,
    targetIdentifier: string | 'all',
    preferenceGroups: string[] = ['ui', 'notifications', 'ai-settings', 'workflows'],
    conflictResolution: 'newest' | 'oldest' | 'source' | 'target' = 'newest'
  ): Promise<SyncResult> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        return {
          success: false,
          syncedAt: new Date(),
          syncedPreferenceGroups: [],
          syncedKeys: []
        };
      }
      
      // Get device information
      const devices = this.connectedDevices.get(userId) || [];
      const sourceDevice = devices.find(d => d.identifier === sourceIdentifier);
      
      if (!sourceDevice) {
        // Register this device if it's not yet registered
        this.registerSyncTarget(userId, {
          type: 'browser',
          identifier: sourceIdentifier,
          name: `Unknown Device (${sourceIdentifier.substring(0, 8)})`
        });
      }
      
      // If target is 'all', sync to all registered devices
      const targetDevices = targetIdentifier === 'all'
        ? devices.filter(d => d.identifier !== sourceIdentifier)
        : devices.filter(d => d.identifier === targetIdentifier);
      
      if (targetDevices.length === 0) {
        return {
          success: false,
          syncedAt: new Date(),
          syncedPreferenceGroups: [],
          syncedKeys: []
        };
      }
      
      // In a real implementation, we would broadcast changes to other devices
      // via WebSockets or a similar mechanism. For this implementation, we'll
      // just track that the sync occurred and log it.
      
      const syncedKeys: string[] = [];
      
      // Track what got synced based on the preference groups
      if (preferenceGroups.includes('ui')) {
        syncedKeys.push('theme', 'uiDensity', 'customization');
      }
      
      if (preferenceGroups.includes('notifications')) {
        syncedKeys.push('notificationSettings');
      }
      
      if (preferenceGroups.includes('ai-settings')) {
        syncedKeys.push('aiSettings');
      }
      
      if (preferenceGroups.includes('workflows')) {
        syncedKeys.push('defaultWorkflowSettings');
      }
      
      // Update last sync time for all involved devices
      const now = new Date();
      devices.forEach(device => {
        if (device.identifier === sourceIdentifier || 
            targetDevices.some(t => t.identifier === device.identifier)) {
          device.lastSyncTime = now;
        }
      });
      
      // Log the sync activity
      activityLogger.logActivity({
        level: LogLevel.Info,
        action: 'sync_preferences',
        entityType: EntityType.User,
        entityId: userId.toString(),
        details: {
          sourceIdentifier,
          targetIdentifier,
          preferenceGroups,
          syncedKeys,
          syncedAt: now
        }
      });
      
      return {
        success: true,
        syncedAt: now,
        syncedPreferenceGroups: preferenceGroups,
        syncedKeys
      };
    } catch (error) {
      activityLogger.logActivity({
        level: LogLevel.Error,
        action: 'sync_preferences_error',
        entityType: EntityType.User,
        entityId: userId.toString(),
        details: { error: String(error) }
      });
      
      return {
        success: false,
        syncedAt: new Date(),
        syncedPreferenceGroups: [],
        syncedKeys: []
      };
    }
  }
  /**
   * Get user preferences
   */
  public async getUserPreferences(userId: number): Promise<UserPreference | null> {
    try {
      const [preferences] = await db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.userId, userId));
      
      return preferences || null;
    } catch (error) {
      activityLogger.logActivity({
        level: LogLevel.Error,
        action: 'get_user_preferences',
        entityType: EntityType.User,
        entityId: userId.toString(),
        details: { error: String(error) }
      });
      
      return null;
    }
  }

  /**
   * Create or update user preferences
   */
  public async saveUserPreferences(
    userId: number, 
    preferences: Partial<InsertUserPreference>
  ): Promise<UserPreference> {
    try {
      const existingPrefs = await this.getUserPreferences(userId);
      
      // If preferences already exist, update them
      if (existingPrefs) {
        const [updatedPrefs] = await db
          .update(userPreferences)
          .set({
            ...preferences,
            updatedAt: new Date()
          })
          .where(eq(userPreferences.id, existingPrefs.id))
          .returning();
        
        activityLogger.logActivity({
          level: LogLevel.Info,
          action: 'update_user_preferences',
          userId,
          entityType: EntityType.User,
          entityId: userId.toString(),
          details: { updated: Object.keys(preferences) }
        });
        
        return updatedPrefs;
      }
      
      // Otherwise create new preferences
      const newPrefs: InsertUserPreference = {
        userId,
        ...(DEFAULT_USER_PREFERENCES as any),
        ...preferences,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const [createdPrefs] = await db
        .insert(userPreferences)
        .values(newPrefs)
        .returning();
      
      activityLogger.logActivity({
        level: LogLevel.Info,
        action: 'create_user_preferences',
        userId,
        entityType: EntityType.User,
        entityId: userId.toString()
      });
      
      return createdPrefs;
    } catch (error) {
      activityLogger.logActivity({
        level: LogLevel.Error,
        action: 'save_user_preferences',
        userId,
        entityType: EntityType.User,
        entityId: userId.toString(),
        details: { error: String(error) }
      });
      
      throw error;
    }
  }

  /**
   * Update specific user preference field
   */
  public async updatePreference(
    userId: number,
    key: string,
    value: any
  ): Promise<UserPreference> {
    // Get current preferences
    const existingPrefs = await this.getUserPreferences(userId);
    
    // If preferences don't exist, create them with this value
    if (!existingPrefs) {
      const newPrefs = { ...DEFAULT_USER_PREFERENCES } as any;
      
      // Handle nested properties
      if (key.includes('.')) {
        const [category, subKey] = key.split('.');
        newPrefs[category] = { 
          ...newPrefs[category],
          [subKey]: value 
        };
      } else {
        newPrefs[key] = value;
      }
      
      return this.saveUserPreferences(userId, newPrefs);
    }
    
    // Handle nested properties (e.g., "aiSettings.temperature")
    if (key.includes('.')) {
      const [category, subKey] = key.split('.');
      const currentCategory = existingPrefs[category as keyof UserPreference] as Record<string, any> || {};
      
      return this.saveUserPreferences(userId, {
        [category]: {
          ...currentCategory,
          [subKey]: value
        }
      } as any);
    }
    
    // Handle top-level properties
    return this.saveUserPreferences(userId, {
      [key]: value
    } as any);
  }

  /**
   * Reset user preferences to defaults
   */
  public async resetPreferences(userId: number): Promise<UserPreference> {
    const existingPrefs = await this.getUserPreferences(userId);
    
    if (existingPrefs) {
      const [resetPrefs] = await db
        .update(userPreferences)
        .set({
          ...DEFAULT_USER_PREFERENCES as any,
          updatedAt: new Date()
        })
        .where(eq(userPreferences.id, existingPrefs.id))
        .returning();
      
      activityLogger.logActivity({
        level: LogLevel.Info,
        action: 'reset_user_preferences',
        userId,
        entityType: EntityType.User,
        entityId: userId.toString()
      });
      
      return resetPrefs;
    }
    
    // If preferences don't exist yet, create with defaults
    return this.saveUserPreferences(userId, DEFAULT_USER_PREFERENCES as any);
  }

  /**
   * Get a specific preference value
   */
  public async getPreference<T>(
    userId: number,
    key: string,
    defaultValue?: T
  ): Promise<T> {
    const prefs = await this.getUserPreferences(userId);
    
    if (!prefs) {
      return defaultValue as T;
    }
    
    // Handle nested properties (e.g., "aiSettings.temperature")
    if (key.includes('.')) {
      const [category, subKey] = key.split('.');
      const categoryObj = prefs[category as keyof UserPreference] as any;
      
      if (!categoryObj) {
        return defaultValue as T;
      }
      
      return (categoryObj[subKey] ?? defaultValue) as T;
    }
    
    // Handle top-level properties
    return (prefs[key as keyof UserPreference] ?? defaultValue) as T;
  }
}

// Export a singleton instance for direct use
export const userPreferencesService = new UserPreferencesService();