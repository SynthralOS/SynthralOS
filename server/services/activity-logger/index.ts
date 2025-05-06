/**
 * Activity Logger Service
 * 
 * Provides centralized logging of user actions and system events
 * for audit trail and analytics purposes.
 */

import { db } from '../../db';
import { 
  activityLogs, 
  LogLevel,
  EntityType, 
  InsertActivityLog
} from '@shared/schema';
import { desc, eq, and, sql } from 'drizzle-orm';

export interface LogActivityOptions {
  userId?: number;
  level: LogLevel;
  action: string;
  entityType?: EntityType;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface GetActivityLogOptions {
  userId?: number;
  level?: LogLevel;
  action?: string;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Activity Logger Service
 */
export class ActivityLoggerService {
  /**
   * Log an activity
   */
  public async logActivity(options: LogActivityOptions): Promise<void> {
    try {
      const activityData: InsertActivityLog = {
        userId: options.userId,
        level: options.level,
        action: options.action,
        entityType: options.entityType,
        entityId: options.entityId,
        details: options.details,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        timestamp: new Date()
      };

      await db.insert(activityLogs).values(activityData);
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Get activity logs with filtering options
   */
  public async getActivityLogs(options: GetActivityLogOptions = {}) {
    const whereConditions = [];
    
    if (options.userId !== undefined) {
      whereConditions.push(eq(activityLogs.userId, options.userId));
    }
    
    if (options.level) {
      whereConditions.push(eq(activityLogs.level, options.level));
    }
    
    if (options.action) {
      whereConditions.push(eq(activityLogs.action, options.action));
    }
    
    if (options.entityType) {
      whereConditions.push(eq(activityLogs.entityType, options.entityType));
    }
    
    if (options.entityId) {
      whereConditions.push(eq(activityLogs.entityId, options.entityId));
    }
    
    if (options.startDate) {
      whereConditions.push(sql`${activityLogs.timestamp} >= ${options.startDate}`);
    }
    
    if (options.endDate) {
      whereConditions.push(sql`${activityLogs.timestamp} <= ${options.endDate}`);
    }
    
    const queryCondition = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;
    
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    
    // Get count of total results for pagination
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLogs)
      .where(queryCondition);
    
    // Get the actual results
    const logs = await db
      .select()
      .from(activityLogs)
      .where(queryCondition)
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit)
      .offset(offset);
    
    return {
      logs,
      total: Number(count),
      limit,
      offset
    };
  }

  /**
   * Get recent activity for a user
   */
  public async getUserActivity(userId: number, limit: number = 10) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  /**
   * Get activity by entity
   */
  public async getEntityActivity(
    entityType: EntityType, 
    entityId: string, 
    limit: number = 10
  ) {
    return db
      .select()
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.entityType, entityType),
          eq(activityLogs.entityId, entityId)
        )
      )
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  /**
   * Get system activity logs
   */
  public async getSystemActivity(limit: number = 20) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.entityType, EntityType.System))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }

  /**
   * Get error logs
   */
  public async getErrorLogs(limit: number = 50) {
    return db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.level, LogLevel.Error))
      .orderBy(desc(activityLogs.timestamp))
      .limit(limit);
  }
}

// Export a singleton instance for direct use
export const activityLogger = new ActivityLoggerService();

// Convenience logging methods
export const logInfo = (
  action: string, 
  details?: Record<string, any>, 
  userId?: number,
  entityType?: EntityType,
  entityId?: string,
  req?: any
) => {
  return activityLogger.logActivity({
    level: LogLevel.Info,
    action,
    details,
    userId,
    entityType,
    entityId,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent']
  });
};

export const logError = (
  action: string, 
  error: any, 
  userId?: number,
  entityType?: EntityType,
  entityId?: string,
  req?: any
) => {
  const details = {
    message: error?.message || String(error),
    stack: error?.stack,
    code: error?.code
  };
  
  return activityLogger.logActivity({
    level: LogLevel.Error,
    action,
    details,
    userId,
    entityType,
    entityId,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent']
  });
};

export const logWarning = (
  action: string, 
  details?: Record<string, any>, 
  userId?: number,
  entityType?: EntityType,
  entityId?: string,
  req?: any
) => {
  return activityLogger.logActivity({
    level: LogLevel.Warning,
    action,
    details,
    userId,
    entityType,
    entityId,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent']
  });
};

export const logDebug = (
  action: string, 
  details?: Record<string, any>, 
  userId?: number,
  entityType?: EntityType,
  entityId?: string,
  req?: any
) => {
  return activityLogger.logActivity({
    level: LogLevel.Debug,
    action,
    details,
    userId,
    entityType,
    entityId,
    ipAddress: req?.ip,
    userAgent: req?.headers?.['user-agent']
  });
};