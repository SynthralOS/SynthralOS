import { db } from '../../db';
import { ScraperFactory } from './ScraperFactory';
import { ScraperType, AnyScraperConfig } from './types';
import { 
  scrapingJobs, 
  scrapingResults, 
  changeDetectionMonitors, 
  changeDetectionAlerts,
  insertScrapingJobSchema,
  AlertStatus,
  JobStatus
} from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';
import { diffText } from './utils/textDiff';
import { v4 as uuid } from 'uuid';

/**
 * Service for handling scraping operations
 */
export class ScrapingService {
  private scraperFactory: ScraperFactory;

  constructor() {
    this.scraperFactory = ScraperFactory.getInstance();
  }

  /**
   * Create a new scraping job
   */
  async createJob(
    userId: number,
    name: string,
    description: string | undefined,
    type: ScraperType,
    config: AnyScraperConfig
  ) {
    const jobId = uuid();
    const [job] = await db.insert(scrapingJobs)
      .values({
        id: jobId,
        userId,
        name,
        description,
        type,
        config,
        status: JobStatus.Created
      })
      .returning();
    
    return job;
  }

  /**
   * Get all scraping jobs for a user
   */
  async getJobsByUser(userId: number) {
    const jobs = await db.select()
      .from(scrapingJobs)
      .where(eq(scrapingJobs.userId, userId))
      .orderBy(desc(scrapingJobs.createdAt));
    
    return jobs;
  }

  /**
   * Get a specific scraping job
   */
  async getJob(jobId: string) {
    const [job] = await db.select()
      .from(scrapingJobs)
      .where(eq(scrapingJobs.id, jobId));
    
    return job;
  }

  /**
   * Get results for a specific job
   */
  async getJobResults(jobId: string) {
    const results = await db.select()
      .from(scrapingResults)
      .where(eq(scrapingResults.jobId, jobId))
      .orderBy(desc(scrapingResults.createdAt));
    
    return results;
  }

  /**
   * Delete a scraping job
   */
  async deleteJob(jobId: string) {
    // First delete all results
    await db.delete(scrapingResults)
      .where(eq(scrapingResults.jobId, jobId));
    
    // Then delete the job
    await db.delete(scrapingJobs)
      .where(eq(scrapingJobs.id, jobId));
    
    return true;
  }

  /**
   * Run a scraping job
   */
  async runJob(jobId: string) {
    // Get the job
    const job = await this.getJob(jobId);
    
    if (!job) {
      throw new Error('Job not found');
    }
    
    // Update job status
    await db.update(scrapingJobs)
      .set({
        status: JobStatus.Running,
        lastRunAt: new Date()
      })
      .where(eq(scrapingJobs.id, jobId));
    
    try {
      // Create the scraper
      const scraper = await this.scraperFactory.createScraper(job.type as ScraperType, job.config);
      
      // Run the scraper
      const data = await scraper.scrape();
      
      // Save result
      const [result] = await db.insert(scrapingResults)
        .values({
          jobId,
          success: true,
          data,
          metadata: {
            runtime: new Date().getTime() - new Date(job.lastRunAt || job.createdAt).getTime(),
            itemCount: Array.isArray(data) ? data.length : 1
          }
        })
        .returning();
      
      // Update job status
      await db.update(scrapingJobs)
        .set({
          status: JobStatus.Completed,
          lastCompletedAt: new Date()
        })
        .where(eq(scrapingJobs.id, jobId));
      
      return result;
    } catch (error) {
      console.error('Error running scraping job:', error);
      
      // Save error result
      const [result] = await db.insert(scrapingResults)
        .values({
          jobId,
          success: false,
          error: error.message,
          metadata: {
            stack: error.stack
          }
        })
        .returning();
      
      // Update job status
      await db.update(scrapingJobs)
        .set({
          status: JobStatus.Failed
        })
        .where(eq(scrapingJobs.id, jobId));
      
      return result;
    }
  }

  /**
   * Run a scraper without saving as a job
   */
  async scrape(type: ScraperType, config: AnyScraperConfig) {
    try {
      // Check if the scraper type is supported
      if (!this.scraperFactory.isTypeSupported(type as ScraperType)) {
        throw new Error(`Unsupported scraper type: ${type}`);
      }
      
      // Create the scraper
      const scraper = await this.scraperFactory.createScraper(type as ScraperType, config);
      
      // Run the scraper
      const data = await scraper.scrape();
      
      return {
        success: true,
        data,
        metadata: {
          runtime: scraper.getRuntime(),
          itemCount: Array.isArray(data) ? data.length : 1
        }
      };
    } catch (error) {
      console.error('Error running scraper:', error);
      
      return {
        success: false,
        error: error.message,
        metadata: {
          stack: error.stack
        }
      };
    }
  }

  /**
   * Create a change detection monitor
   */
  async createChangeDetectionMonitor(
    userId: number,
    name: string,
    url: string,
    selectors: Record<string, string>,
    frequency: string,
    diffThreshold: number = 0.05,
    ignoredSelectors?: string[]
  ) {
    // Create the monitor
    const [monitor] = await db.insert(changeDetectionMonitors)
      .values({
        userId,
        name,
        url,
        selectors,
        frequency,
        diffThreshold,
        ignoredSelectors: ignoredSelectors || [],
        isActive: true
      })
      .returning();
    
    // Run initial scrape to establish baseline
    await this.runChangeDetection(monitor.id, true);
    
    return monitor;
  }

  /**
   * Get all change detection monitors for a user
   */
  async getChangeDetectionMonitors(userId: number) {
    const monitors = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.userId, userId))
      .orderBy(desc(changeDetectionMonitors.createdAt));
    
    return monitors;
  }

  /**
   * Update a change detection monitor
   */
  async updateChangeDetectionMonitor(
    monitorId: number,
    updates: Partial<typeof changeDetectionMonitors.$inferInsert>
  ) {
    // Update the monitor
    const [updatedMonitor] = await db.update(changeDetectionMonitors)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(changeDetectionMonitors.id, monitorId))
      .returning();
    
    return updatedMonitor;
  }

  /**
   * Delete a change detection monitor
   */
  async deleteChangeDetectionMonitor(monitorId: number) {
    // First delete all alerts
    await db.delete(changeDetectionAlerts)
      .where(eq(changeDetectionAlerts.monitorId, monitorId));
    
    // Then delete the monitor
    await db.delete(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    return true;
  }

  /**
   * Run a change detection check
   */
  async runChangeDetection(monitorId: number, isBaseline: boolean = false) {
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    if (!monitor) {
      throw new Error('Monitor not found');
    }
    
    try {
      // Create a BeautifulSoup scraper for the monitor's URL
      const scraper = await this.scraperFactory.createScraper(ScraperType.BeautifulSoup, {
        url: monitor.url,
        selectors: monitor.selectors,
        waitForSelector: Object.values(monitor.selectors)[0] // Use first selector as wait condition
      });
      
      // Scrape the content
      const content = await scraper.scrape();
      
      // If this is a baseline run or there is no baseline yet, set it and return
      if (isBaseline || !monitor.baselineContent) {
        await db.update(changeDetectionMonitors)
          .set({
            baselineContent: content,
            lastCheckedAt: new Date()
          })
          .where(eq(changeDetectionMonitors.id, monitorId));
        
        return null;
      }
      
      // Compare with baseline
      const diffResult = diffText(
        JSON.stringify(monitor.baselineContent),
        JSON.stringify(content),
        { ignoreWhitespace: true }
      );
      
      // Check if the difference is above the threshold
      if (diffResult.changePercentage > monitor.diffThreshold) {
        // Create an alert
        const [alert] = await db.insert(changeDetectionAlerts)
          .values({
            monitorId,
            previousContent: monitor.baselineContent,
            currentContent: content,
            diffPct: diffResult.changePercentage,
            diffDetails: diffResult,
            status: AlertStatus.Unread
          })
          .returning();
        
        // Update the monitor
        await db.update(changeDetectionMonitors)
          .set({
            baselineContent: content, // Update baseline to current
            lastCheckedAt: new Date(),
            lastChangedAt: new Date()
          })
          .where(eq(changeDetectionMonitors.id, monitorId));
        
        return alert;
      }
      
      // Just update the check time if no significant changes
      await db.update(changeDetectionMonitors)
        .set({
          lastCheckedAt: new Date()
        })
        .where(eq(changeDetectionMonitors.id, monitorId));
      
      return null;
    } catch (error) {
      console.error('Error running change detection:', error);
      
      // Update check time even on error
      await db.update(changeDetectionMonitors)
        .set({
          lastCheckedAt: new Date()
        })
        .where(eq(changeDetectionMonitors.id, monitorId));
      
      throw error;
    }
  }

  /**
   * Get all alerts for a monitor
   */
  async getChangeDetectionAlerts(monitorId: number) {
    const alerts = await db.select()
      .from(changeDetectionAlerts)
      .where(eq(changeDetectionAlerts.monitorId, monitorId))
      .orderBy(desc(changeDetectionAlerts.createdAt));
    
    return alerts;
  }

  /**
   * Mark an alert as read
   */
  async markChangeDetectionAlertAsRead(alertId: number) {
    const [alert] = await db.update(changeDetectionAlerts)
      .set({
        status: AlertStatus.Read,
        readAt: new Date()
      })
      .where(eq(changeDetectionAlerts.id, alertId))
      .returning();
    
    return alert;
  }
}