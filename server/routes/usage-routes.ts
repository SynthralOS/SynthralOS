import express, { Request, Response } from 'express';
import { db } from '../db';
import { storage } from '../storage';
import { 
  users
} from '../../shared/schema';
import { and, eq, gte, lte, sql, sum, count } from 'drizzle-orm';

const router = express.Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  next();
};

// Get current usage with quotas
router.get('/api/usage', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.start ? new Date(req.query.start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end ? new Date(req.query.end as string) : new Date();
    
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get organization ID if user belongs to one
    let organizationId = null;
    if (user.organizationId) {
      organizationId = user.organizationId;
    }
    
    // Get usage quotas
    const quotas = await db
      .select()
      .from(usageQuotas)
      .where(
        organizationId 
          ? eq(usageQuotas.organizationId, organizationId)
          : eq(usageQuotas.userId, userId)
      );
    
    // Get usage summaries by type
    const usageSummary = await db
      .select({
        usageType: usageRecords.usageType,
        totalUsage: sql<number>`SUM(${usageRecords.quantity})`,
      })
      .from(usageRecords)
      .where(
        and(
          organizationId 
            ? eq(usageRecords.organizationId, organizationId)
            : eq(usageRecords.userId, userId),
          gte(usageRecords.timestamp, startDate),
          lte(usageRecords.timestamp, endDate)
        )
      )
      .groupBy(usageRecords.usageType);
    
    // Get model usage details
    const modelUsage = await db
      .select({
        model: modelCostLogs.model,
        totalInputTokens: sql<number>`SUM(${modelCostLogs.tokensInput})`,
        totalOutputTokens: sql<number>`SUM(${modelCostLogs.tokensOutput})`,
        totalCost: sql<number>`SUM(${modelCostLogs.cost})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(modelCostLogs)
      .where(
        and(
          eq(modelCostLogs.userId, userId),
          gte(modelCostLogs.timestamp, startDate),
          lte(modelCostLogs.timestamp, endDate)
        )
      )
      .groupBy(modelCostLogs.model);
    
    // Calculate percent used for each quota
    const summaryWithQuotas = usageSummary.map(summary => {
      const quota = quotas.find(q => q.usageType === summary.usageType);
      let percentUsed = null;
      
      if (quota && quota.limit > 0) {
        percentUsed = Math.min(100, Math.round((summary.totalUsage / quota.limit) * 100));
      }
      
      return {
        ...summary,
        quota: quota?.limit || null,
        percentUsed,
      };
    });
    
    // Return usage data with period info
    res.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: summaryWithQuotas,
      modelUsage,
    });
  } catch (error) {
    console.error('Error fetching usage data:', error);
    res.status(500).json({ message: 'Failed to fetch usage data' });
  }
});

// Get historical usage data
router.get('/api/usage/history', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const period = req.query.period || '30d';
    
    // Calculate date range based on period
    const endDate = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }
    
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Get daily usage data
    const dailyData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('day', timestamp) as date,
        usage_type as type,
        SUM(quantity) as value
      FROM usage_records
      WHERE 
        user_id = ${userId} AND
        timestamp >= ${startDate} AND
        timestamp <= ${endDate}
      GROUP BY DATE_TRUNC('day', timestamp), usage_type
      ORDER BY date
    `);
    
    // Get usage by type
    const byTypeData = await db.execute(sql`
      SELECT 
        usage_type as type,
        SUM(quantity) as value,
        ROUND(100.0 * SUM(quantity) / (
          SELECT SUM(quantity) FROM usage_records
          WHERE 
            user_id = ${userId} AND
            timestamp >= ${startDate} AND
            timestamp <= ${endDate}
        ), 1) as percentage
      FROM usage_records
      WHERE 
        user_id = ${userId} AND
        timestamp >= ${startDate} AND
        timestamp <= ${endDate}
      GROUP BY usage_type
    `);
    
    // Get model usage breakdown
    const byModelData = await db.execute(sql`
      SELECT 
        model,
        SUM(tokens_input + tokens_output) as tokens,
        SUM(cost) as cost,
        ROUND(100.0 * SUM(tokens_input + tokens_output) / (
          SELECT SUM(tokens_input + tokens_output) FROM model_cost_logs
          WHERE 
            user_id = ${userId} AND
            timestamp >= ${startDate} AND
            timestamp <= ${endDate}
        ), 1) as percentage
      FROM model_cost_logs
      WHERE 
        user_id = ${userId} AND
        timestamp >= ${startDate} AND
        timestamp <= ${endDate}
      GROUP BY model
    `);
    
    // Get total cost
    const totalCostResult = await db.execute(sql`
      SELECT SUM(cost) as total_cost
      FROM model_cost_logs
      WHERE 
        user_id = ${userId} AND
        timestamp >= ${startDate} AND
        timestamp <= ${endDate}
    `);
    
    const totalCost = totalCostResult.rows[0]?.total_cost || 0;
    
    // Get total tokens
    const totalTokensResult = await db.execute(sql`
      SELECT SUM(tokens_input + tokens_output) as total_tokens
      FROM model_cost_logs
      WHERE 
        user_id = ${userId} AND
        timestamp >= ${startDate} AND
        timestamp <= ${endDate}
    `);
    
    const totalTokens = totalTokensResult.rows[0]?.total_tokens || 0;
    
    res.json({
      daily: dailyData.rows,
      byType: byTypeData.rows,
      byModel: byModelData.rows,
      totalCost,
      totalTokens,
    });
  } catch (error) {
    console.error('Error fetching usage history:', error);
    res.status(500).json({ message: 'Failed to fetch usage history' });
  }
});

export default router;