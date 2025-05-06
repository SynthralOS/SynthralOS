import { BaseScraper } from '../BaseScraper';
import { ScraperType, CloudscraperConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';

/**
 * Cloudscraper Scraper
 * Specialized tool for bypassing Cloudflare protection
 */
export class CloudscraperScraper extends BaseScraper {
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.CLOUDSCRAPER;
  }
  
  /**
   * Initialize the scraper
   */
  protected async doInitialize(): Promise<boolean> {
    try {
      // We don't need to do anything special here
      return true;
    } catch (error) {
      console.error('Error initializing Cloudscraper:', error);
      return false;
    }
  }
  
  /**
   * Validate the configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const cloudscraperConfig = config as CloudscraperConfig;
    
    if (!cloudscraperConfig.urls || cloudscraperConfig.urls.length === 0) {
      errors.push('At least one URL is required for Cloudscraper');
    }
    
    return errors;
  }
  
  /**
   * Execute the scraping operation
   */
  protected async doScrape(): Promise<ScrapingResult> {
    try {
      const cloudscraperConfig = this.config as CloudscraperConfig;
      const results = [];
      const errors = [];
      
      // Import cloudscraper dynamically to avoid requiring it at startup
      const cloudscraper = require('cloudscraper');
      
      // Configure cloudscraper options
      const options = {
        challengeTimeout: cloudscraperConfig.challengeTimeout || 30000,
        timeout: cloudscraperConfig.timeout || 60000,
        cloudflareMaxTimeout: cloudscraperConfig.cloudflareMaxTimeout || 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          ...cloudscraperConfig.headers
        }
      };
      
      // Scrape each URL
      for (const url of cloudscraperConfig.urls || []) {
        try {
          this.incrementRequestCount();
          const startTime = Date.now();
          
          // Fetch the page content
          const response = await cloudscraper.get({
            uri: url,
            ...options
          });
          
          // Calculate response time and bytes received
          const endTime = Date.now();
          this.addResponseTime(endTime - startTime);
          this.addBytesReceived(Buffer.byteLength(response, 'utf8'));
          
          // Parse the HTML content with cheerio
          const $ = cheerio.load(response);
          
          // Extract page data
          const title = $('title').text();
          const links = $('a').map((i, el) => $(el).attr('href')).get();
          const text = $('body').text();
          
          // Extract metadata
          const metaDescription = $('meta[name="description"]').attr('content');
          const ogTitle = $('meta[property="og:title"]').attr('content');
          const ogDescription = $('meta[property="og:description"]').attr('content');
          const ogImage = $('meta[property="og:image"]').attr('content');
          
          // Add the result
          results.push({
            url,
            title,
            links,
            text,
            html: response,
            metadata: {
              metaDescription,
              ogTitle,
              ogDescription,
              ogImage
            }
          });
        } catch (error: any) {
          errors.push(`Error scraping ${url}: ${error.message}`);
          
          // Add partial result with error
          results.push({
            url,
            error: error.message
          });
          
          continue;
        }
        
        // Check if scraping should be cancelled
        if (this.shouldCancel()) {
          break;
        }
      }
      
      // Check if there were any errors
      if (errors.length > 0 && errors.length === cloudscraperConfig.urls!.length) {
        // All URLs failed
        return this.createErrorResult(errors.join('\n'));
      } else if (errors.length > 0) {
        // Some URLs failed
        return this.createPartialResult(results, cloudscraperConfig.urls![0], errors.join('\n'));
      }
      
      // All URLs succeeded
      return this.createSuccessResult(results, cloudscraperConfig.urls![0]);
    } catch (error: any) {
      return this.createErrorResult(error.message || 'Failed to execute Cloudscraper scraper');
    }
  }
  
  /**
   * Cancel the scraping operation
   */
  protected async doCancel(): Promise<boolean> {
    // Nothing specific to cancel for Cloudscraper
    return true;
  }
}