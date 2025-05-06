/**
 * Usage Tracking Service
 * 
 * Tracks and records usage of various resources in the system, including:
 * - Model token usage (input and output)
 * - API calls
 * - Workflow executions
 * - Storage usage
 * 
 * Also handles quota enforcement and alerts when usage thresholds are reached.
 */

import { db } from "../db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import {
  modelCostLogs,
  usageRecords,
  usageQuotas,
  usageAlerts,
  users,
  organizations,
  subscriptionPlans,
} from "@shared/schema";
import type { 
  UsageRecord, 
  UsageQuota, 
  InsertUsageRecord,
  InsertUsageQuota
} from "@shared/schema";

// Define interface for model pricing
interface ModelPricing {
  [key: string]: {
    input: number;
    output: number;
  };
}

// Model pricing (in cent per 1000 tokens)
const MODEL_PRICING: ModelPricing = {
  'gpt-4o': {
    input: 5,
    output: 15,
  },
  'gpt-4': {
    input: 30,
    output: 60,
  },
  'gpt-3.5-turbo': {
    input: 0.5,
    output: 1.5,
  },
  'claude-3-7-sonnet-20250219': {
    input: 3,
    output: 15,
  },
  'claude-3-5-sonnet-20240620': {
    input: 3,
    output: 15,
  },
  'claude-3-opus': {
    input: 15,
    output: 75,
  },
  'claude-3-sonnet': {
    input: 3,
    output: 15,
  },
  'claude-3-haiku': {
    input: 0.25,
    output: 1.25,
  }
};

// Usage types
export enum UsageType {
  MODEL_TOKENS = 'model.tokens',
  API_CALLS = 'api.calls',
  WORKFLOW_EXECUTIONS = 'workflow.executions',
  STORAGE_BYTES = 'storage.bytes',
  OCR_PAGES = 'ocr.pages',
  SCRAPER_REQUESTS = 'scraper.requests',
}

// Time periods for quotas
export enum QuotaPeriod {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

/**
 * Record model usage cost
 */
export async function recordModelCost(
  userId: number,
  model: string,
  tokensInput: number,
  tokensOutput: number,
  workflowId?: number,
  executionId?: number
) {
  // Calculate cost in cents
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-3.5-turbo']; // Default to cheapest if model not found
  const inputCost = Math.ceil((tokensInput / 1000) * pricing.input);
  const outputCost = Math.ceil((tokensOutput / 1000) * pricing.output);
  const totalCost = inputCost + outputCost;
  
  // Insert to modelCostLogs
  const [log] = await db.insert(modelCostLogs).values({
    userId,
    workflowId,
    executionId,
    model,
    tokensInput,
    tokensOutput,
    cost: totalCost,
  }).returning();
  
  // Also record for usage tracking and quota management
  const { billingPeriodStart, billingPeriodEnd } = getCurrentBillingPeriod(userId);
  
  await recordUsage({
    userId,
    usageType: UsageType.MODEL_TOKENS,
    quantity: tokensInput + tokensOutput,
    metadata: {
      model,
      inputTokens: tokensInput,
      outputTokens: tokensOutput,
      cost: totalCost,
      workflowId,
      executionId,
    },
    billingPeriodStart,
    billingPeriodEnd,
  });
  
  return log;
}

/**
 * Record general usage
 */
export async function recordUsage(data: InsertUsageRecord) {
  // Insert the usage record
  const [record] = await db.insert(usageRecords).values(data).returning();
  
  // Check if this hits any quotas and trigger alerts if needed
  await checkQuotaLimits(record);
  
  return record;
}

/**
 * Check if usage has exceeded any quota limits and trigger alerts
 */
async function checkQuotaLimits(record: UsageRecord) {
  // Get applicable quota (user or org level)
  const quotaQuery = record.userId 
    ? eq(usageQuotas.userId, record.userId)
    : eq(usageQuotas.organizationId, record.organizationId);
  
  const quota = await db.query.usageQuotas.findFirst({
    where: and(
      quotaQuery,
      eq(usageQuotas.usageType, record.usageType)
    )
  });
  
  if (!quota) return; // No quota set
  
  // Get total usage for this period
  const totalUsage = await getTotalUsage(
    record.usageType, 
    record.userId, 
    record.organizationId,
    record.billingPeriodStart,
    record.billingPeriodEnd
  );
  
  // Check if usage exceeds quota
  const usagePercent = Math.floor((totalUsage / quota.limit) * 100);
  
  // Check for alerts at various thresholds
  const alertThresholds = [50, 75, 90, 100];
  
  for (const threshold of alertThresholds) {
    if (usagePercent >= threshold) {
      // Check if we've already sent an alert for this threshold
      const existingAlert = await db.query.usageAlerts.findFirst({
        where: and(
          record.userId ? eq(usageAlerts.userId, record.userId) : eq(usageAlerts.organizationId, record.organizationId),
          eq(usageAlerts.usageType, record.usageType),
          eq(usageAlerts.thresholdPercent, threshold),
          eq(usageAlerts.billingPeriodStart, record.billingPeriodStart),
          eq(usageAlerts.billingPeriodEnd, record.billingPeriodEnd),
          eq(usageAlerts.notified, true)
        )
      });
      
      if (!existingAlert) {
        // Create alert and trigger notification
        await createUsageAlert(
          record.usageType,
          threshold,
          record.userId,
          record.organizationId,
          record.billingPeriodStart,
          record.billingPeriodEnd,
          totalUsage,
          quota.limit
        );
      }
    }
  }
  
  // If this is a hard limit and we've exceeded it, throw an error
  if (quota.isHardLimit && totalUsage > quota.limit) {
    throw new Error(`Usage quota exceeded for ${record.usageType}. Limit: ${quota.limit}, Current: ${totalUsage}`);
  }
}

/**
 * Create a usage alert and send notification
 */
async function createUsageAlert(
  usageType: string,
  thresholdPercent: number,
  userId?: number,
  organizationId?: number,
  billingPeriodStart?: Date,
  billingPeriodEnd?: Date,
  currentUsage?: number,
  limit?: number
) {
  // Create alert record
  const [alert] = await db.insert(usageAlerts).values({
    userId,
    organizationId,
    usageType,
    thresholdPercent,
    notified: true,
    notifiedAt: new Date(),
    billingPeriodStart: billingPeriodStart || new Date(),
    billingPeriodEnd: billingPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
  }).returning();
  
  // TODO: Send email notification
  // This would integrate with an email service
  
  // TODO: Create in-app notification
  
  return alert;
}

/**
 * Get total usage for a specific type within a time period
 */
export async function getTotalUsage(
  usageType: string,
  userId?: number,
  organizationId?: number,
  start?: Date,
  end?: Date
): Promise<number> {
  const whereConditions = [];
  
  // Filter by user or org
  if (userId) {
    whereConditions.push(eq(usageRecords.userId, userId));
  } else if (organizationId) {
    whereConditions.push(eq(usageRecords.organizationId, organizationId));
  }
  
  // Filter by usage type
  whereConditions.push(eq(usageRecords.usageType, usageType));
  
  // Filter by time period if provided
  if (start) {
    whereConditions.push(gte(usageRecords.timestamp, start));
  }
  if (end) {
    whereConditions.push(lte(usageRecords.timestamp, end));
  }
  
  // Sum all usage
  const result = await db
    .select({
      total: sql<number>`sum(${usageRecords.quantity})::int`,
    })
    .from(usageRecords)
    .where(and(...whereConditions));
  
  return result[0]?.total || 0;
}

/**
 * Get current billing period for a user or organization
 */
export function getCurrentBillingPeriod(userId?: number, organizationId?: number): { billingPeriodStart: Date, billingPeriodEnd: Date } {
  // Default to calendar month billing period
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // TODO: Get actual billing period from subscription data if needed
  
  return {
    billingPeriodStart: start,
    billingPeriodEnd: end
  };
}

/**
 * Set a usage quota for a user or organization
 */
export async function setUsageQuota(data: InsertUsageQuota): Promise<UsageQuota> {
  // Check if a quota already exists
  const existingQuota = await db.query.usageQuotas.findFirst({
    where: and(
      data.userId ? eq(usageQuotas.userId, data.userId) : eq(usageQuotas.organizationId, data.organizationId),
      eq(usageQuotas.usageType, data.usageType)
    )
  });
  
  if (existingQuota) {
    // Update existing quota
    const [updated] = await db
      .update(usageQuotas)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(usageQuotas.id, existingQuota.id))
      .returning();
    
    return updated;
  } else {
    // Create new quota
    const [quota] = await db
      .insert(usageQuotas)
      .values(data)
      .returning();
    
    return quota;
  }
}

/**
 * Get usage history for a specific type
 */
export async function getUsageHistory(
  usageType: string,
  userId?: number,
  organizationId?: number,
  start?: Date,
  end?: Date
) {
  const whereConditions = [];
  
  // Filter by user or org
  if (userId) {
    whereConditions.push(eq(usageRecords.userId, userId));
  } else if (organizationId) {
    whereConditions.push(eq(usageRecords.organizationId, organizationId));
  }
  
  // Filter by usage type
  whereConditions.push(eq(usageRecords.usageType, usageType));
  
  // Filter by time period if provided
  if (start) {
    whereConditions.push(gte(usageRecords.timestamp, start));
  }
  if (end) {
    whereConditions.push(lte(usageRecords.timestamp, end));
  }
  
  return db
    .select()
    .from(usageRecords)
    .where(and(...whereConditions))
    .orderBy(usageRecords.timestamp);
}

/**
 * Generate a usage report for a user or organization
 */
export async function generateUsageReport(
  userId?: number,
  organizationId?: number,
  start?: Date,
  end?: Date
) {
  // Default date range to current month if not provided
  const now = new Date();
  const startDate = start || new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = end || new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Get all usage types to include in report
  const allUsageTypes = Object.values(UsageType);
  
  // Build report data
  const reportData = await Promise.all(
    allUsageTypes.map(async (usageType) => {
      const totalUsage = await getTotalUsage(usageType, userId, organizationId, startDate, endDate);
      
      // Get quota if applicable
      const quota = await db.query.usageQuotas.findFirst({
        where: and(
          userId ? eq(usageQuotas.userId, userId) : eq(usageQuotas.organizationId, organizationId),
          eq(usageQuotas.usageType, usageType)
        )
      });
      
      return {
        usageType,
        totalUsage,
        quota: quota?.limit || null,
        percentUsed: quota ? Math.floor((totalUsage / quota.limit) * 100) : null
      };
    })
  );
  
  // Get model usage details specifically
  interface ModelUsageDetail {
    model: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCost: number;
    count: number;
  }
  
  let modelUsageDetails: ModelUsageDetail[] = [];
  if (userId || organizationId) {
    const whereConditions = [];
    
    if (userId) {
      whereConditions.push(eq(modelCostLogs.userId, userId));
    }
    
    if (start) {
      whereConditions.push(gte(modelCostLogs.timestamp, startDate));
    }
    if (end) {
      whereConditions.push(lte(modelCostLogs.timestamp, endDate));
    }
    
    const modelUsage = await db
      .select({
        model: modelCostLogs.model,
        totalInputTokens: sql<number>`sum(${modelCostLogs.tokensInput})::int`,
        totalOutputTokens: sql<number>`sum(${modelCostLogs.tokensOutput})::int`,
        totalCost: sql<number>`sum(${modelCostLogs.cost})::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(modelCostLogs)
      .where(and(...whereConditions))
      .groupBy(modelCostLogs.model);
    
    modelUsageDetails = modelUsage;
  }
  
  return {
    period: {
      start: startDate,
      end: endDate,
    },
    summary: reportData,
    modelUsage: modelUsageDetails,
    // Add any additional report sections needed
  };
}