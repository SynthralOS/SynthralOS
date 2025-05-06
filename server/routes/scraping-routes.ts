import { Router } from 'express';
import { ScrapingService } from '../services/scraping/ScrapingService';
import { ScraperFactory } from '../services/scraping/ScraperFactory';
import { ScraperType } from '../services/scraping/types';
import { db } from '../db';
import { 
  scrapingJobs, 
  scrapingResults, 
  changeDetectionMonitors, 
  changeDetectionAlerts,
  insertScrapingJobSchema
} from '@shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { isAuthenticated } from '../middleware/auth';

// Initialize the router and services
const router = Router();
const scrapingService = new ScrapingService();

// Get available scraper types
router.get('/api/scrapers', isAuthenticated, async (req, res) => {
  // Return available scraper types as an array of strings
  const types = Object.values(ScraperType);
  res.json({ scrapers: types });
});

// Create a scraping job
router.post('/api/scraping-jobs', isAuthenticated, async (req, res) => {
  try {
    // Validate the request body
    const validatedData = insertScrapingJobSchema.parse(req.body);
    
    // Create the job
    const job = await scrapingService.createJob(
      req.user.id,
      validatedData.name,
      validatedData.description,
      validatedData.type as ScraperType,
      validatedData.config
    );
    
    // Return the job
    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating scraping job:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all scraping jobs
router.get('/api/scraping-jobs', isAuthenticated, async (req, res) => {
  try {
    const jobs = await scrapingService.getJobsByUser(req.user.id);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching scraping jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a specific scraping job
router.get('/api/scraping-jobs/:id', isAuthenticated, async (req, res) => {
  try {
    const job = await scrapingService.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if the job belongs to the user
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get the job results
    const results = await scrapingService.getJobResults(job.id);
    
    // Return the job with results
    res.json({ ...job, results });
  } catch (error) {
    console.error('Error fetching scraping job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run a scraping job
router.post('/api/scraping-jobs/:id/run', isAuthenticated, async (req, res) => {
  try {
    const job = await scrapingService.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if the job belongs to the user
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Run the job
    const result = await scrapingService.runJob(job.id);
    
    // Return the result
    res.json(result);
  } catch (error) {
    console.error('Error running scraping job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a scraping job
router.delete('/api/scraping-jobs/:id', isAuthenticated, async (req, res) => {
  try {
    const job = await scrapingService.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if the job belongs to the user
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete the job
    await scrapingService.deleteJob(job.id);
    
    // Return success
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting scraping job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Ad-hoc scraping operation (without saving as a job)
router.post('/api/scrape', isAuthenticated, async (req, res) => {
  try {
    const { type, config } = req.body;
    
    if (!type || !config) {
      return res.status(400).json({ error: 'Type and config are required' });
    }
    
    if (!Object.values(ScraperType).includes(type)) {
      return res.status(400).json({ error: 'Invalid scraper type' });
    }
    
    // Run the scraper
    const result = await scrapingService.scrape(type, config);
    
    // Return the result
    res.json(result);
  } catch (error) {
    console.error('Error during ad-hoc scraping:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get job results
router.get('/api/scraping-jobs/:id/results', isAuthenticated, async (req, res) => {
  try {
    const job = await scrapingService.getJob(req.params.id);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Check if the job belongs to the user
    if (job.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get the job results
    const results = await scrapingService.getJobResults(job.id);
    
    // Return the results
    res.json(results);
  } catch (error) {
    console.error('Error fetching job results:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a change detection monitor
router.post('/api/change-detection', isAuthenticated, async (req, res) => {
  try {
    const { name, url, selectors, frequency, diffThreshold, ignoredSelectors } = req.body;
    
    if (!name || !url || !selectors || !frequency) {
      return res.status(400).json({ error: 'Name, URL, selectors, and frequency are required' });
    }
    
    // Create the monitor
    const monitor = await scrapingService.createChangeDetectionMonitor(
      req.user.id,
      name,
      url,
      selectors,
      frequency,
      diffThreshold,
      ignoredSelectors
    );
    
    // Return the monitor
    res.status(201).json(monitor);
  } catch (error) {
    console.error('Error creating change detection monitor:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get all change detection monitors
router.get('/api/change-detection', isAuthenticated, async (req, res) => {
  try {
    const monitors = await scrapingService.getChangeDetectionMonitors(req.user.id);
    res.json(monitors);
  } catch (error) {
    console.error('Error fetching change detection monitors:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a change detection monitor
router.patch('/api/change-detection/:id', isAuthenticated, async (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    
    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }
    
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Check if the monitor belongs to the user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Update the monitor
    const updatedMonitor = await scrapingService.updateChangeDetectionMonitor(
      monitorId,
      req.body
    );
    
    // Return the updated monitor
    res.json(updatedMonitor);
  } catch (error) {
    console.error('Error updating change detection monitor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a change detection monitor
router.delete('/api/change-detection/:id', isAuthenticated, async (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    
    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }
    
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Check if the monitor belongs to the user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Delete the monitor
    await scrapingService.deleteChangeDetectionMonitor(monitorId);
    
    // Return success
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting change detection monitor:', error);
    res.status(500).json({ error: error.message });
  }
});

// Run a change detection check manually
router.post('/api/change-detection/:id/check', isAuthenticated, async (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    
    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }
    
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Check if the monitor belongs to the user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Run the check
    const alert = await scrapingService.runChangeDetection(monitorId);
    
    // Return the result
    res.json({
      success: true,
      changeDetected: !!alert,
      alert
    });
  } catch (error) {
    console.error('Error running change detection check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all alerts for a monitor
router.get('/api/change-detection/:id/alerts', isAuthenticated, async (req, res) => {
  try {
    const monitorId = parseInt(req.params.id);
    
    if (isNaN(monitorId)) {
      return res.status(400).json({ error: 'Invalid monitor ID' });
    }
    
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, monitorId));
    
    if (!monitor) {
      return res.status(404).json({ error: 'Monitor not found' });
    }
    
    // Check if the monitor belongs to the user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Get the alerts
    const alerts = await scrapingService.getChangeDetectionAlerts(monitorId);
    
    // Return the alerts
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching change detection alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark an alert as read
router.post('/api/change-detection/alerts/:id/read', isAuthenticated, async (req, res) => {
  try {
    const alertId = parseInt(req.params.id);
    
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }
    
    // Get the alert
    const [alert] = await db.select()
      .from(changeDetectionAlerts)
      .where(eq(changeDetectionAlerts.id, alertId));
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    // Get the monitor
    const [monitor] = await db.select()
      .from(changeDetectionMonitors)
      .where(eq(changeDetectionMonitors.id, alert.monitorId));
    
    // Check if the monitor belongs to the user
    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Mark the alert as read
    const updatedAlert = await scrapingService.markChangeDetectionAlertAsRead(alertId);
    
    // Return the updated alert
    res.json(updatedAlert);
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;