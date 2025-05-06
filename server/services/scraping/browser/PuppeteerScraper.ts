import { BaseBrowserScraper } from './BaseBrowserScraper';
import { ScraperType, PuppeteerConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

/**
 * Puppeteer Scraper
 * Chrome automation for dynamic content and single-page applications
 */
export class PuppeteerScraper extends BaseBrowserScraper {
  private browser?: puppeteer.Browser;
  
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.PUPPETEER;
  }
  
  /**
   * Validate the configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const puppeteerConfig = config as PuppeteerConfig;
    
    if (!puppeteerConfig.urls || puppeteerConfig.urls.length === 0) {
      errors.push('At least one URL is required for Puppeteer scraper');
    }
    
    if (puppeteerConfig.waitForFunction && typeof puppeteerConfig.waitForFunction !== 'string') {
      errors.push('waitForFunction must be a string containing valid JavaScript');
    }
    
    if (puppeteerConfig.evaluateOnPage && typeof puppeteerConfig.evaluateOnPage !== 'string') {
      errors.push('evaluateOnPage must be a string containing valid JavaScript');
    }
    
    return errors;
  }
  
  /**
   * Launch the browser
   */
  protected async launchBrowser(): Promise<puppeteer.Browser> {
    const puppeteerConfig = this.config as PuppeteerConfig;
    const headless = puppeteerConfig.headless !== false; // Default to headless
    
    // Define launch options
    const launchOptions: puppeteer.LaunchOptions = {
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    };
    
    // Launch the browser
    this.browser = await puppeteer.launch(launchOptions);
    this.browserProcess = this.browser;
    
    return this.browser;
  }
  
  /**
   * Create a new page in the browser
   */
  protected async createPage(browser: puppeteer.Browser): Promise<puppeteer.Page> {
    const puppeteerConfig = this.config as PuppeteerConfig;
    
    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport if specified
    if (puppeteerConfig.viewport) {
      await page.setViewport(puppeteerConfig.viewport);
    } else {
      await page.setViewport({ width: 1280, height: 720 });
    }
    
    // Enable stealth mode if specified
    if (puppeteerConfig.stealth) {
      // Apply stealth mode techniques
      await page.evaluateOnNewDocument(() => {
        // Hide WebDriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Hide Chrome
        window.navigator.chrome = {
          runtime: {} as any,
        };
        
        // Fake plugins
        Object.defineProperty(navigator, 'plugins', {
          get: function() {
            return [1, 2, 3, 4, 5];
          },
        });
        
        // Fake languages
        Object.defineProperty(navigator, 'languages', {
          get: function() {
            return ['en-US', 'en'];
          },
        });
      });
    }
    
    // Set up request interception if needed
    if (puppeteerConfig.interceptRequests) {
      await page.setRequestInterception(true);
      
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        
        // Skip specified resource types if needed
        const blockResources = ['image', 'stylesheet', 'font', 'media'];
        if (blockResources.includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
    }
    
    return page;
  }
  
  /**
   * Navigate to a URL
   */
  protected async navigateTo(page: puppeteer.Page, url: string): Promise<void> {
    const puppeteerConfig = this.config as PuppeteerConfig;
    
    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: puppeteerConfig.timeout || 30000
    });
    
    // Wait for function if specified
    if (puppeteerConfig.waitForFunction) {
      await page.waitForFunction(puppeteerConfig.waitForFunction, {
        timeout: puppeteerConfig.timeout || 30000
      });
    }
    
    // Run custom scripts if provided
    if (puppeteerConfig.scripts && puppeteerConfig.scripts.length > 0) {
      for (const script of puppeteerConfig.scripts) {
        await page.evaluate(script);
      }
    }
  }
  
  /**
   * Extract text content from a page
   */
  protected async extractTextContent(page: puppeteer.Page): Promise<string> {
    return await page.evaluate(() => {
      return document.body.innerText;
    });
  }
  
  /**
   * Extract links from a page
   */
  protected async extractLinks(page: puppeteer.Page): Promise<string[]> {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href && href.startsWith('http'));
    });
  }
  
  /**
   * Close the browser
   */
  protected async closeBrowser(browser: puppeteer.Browser): Promise<void> {
    await browser.close();
    this.browser = undefined;
    this.browserProcess = null;
  }
  
  /**
   * Initialize the scraper
   */
  protected async doInitialize(): Promise<boolean> {
    // Nothing special to initialize
    return true;
  }
  
  /**
   * Scrape a URL using Puppeteer
   */
  private async scrapeUrl(url: string): Promise<any> {
    const puppeteerConfig = this.config as PuppeteerConfig;
    
    // Launch browser if not already launched
    if (!this.browser) {
      this.browser = await this.launchBrowser();
    }
    
    // Create a new page
    const page = await this.createPage(this.browser);
    
    try {
      // Navigate to the URL
      await this.navigateTo(page, url);
      
      // Take a screenshot
      const screenshotPath = await this.saveScreenshot(page, new URL(url).hostname);
      const screenshot = await this.screenshotToBase64(screenshotPath);
      
      // Extract data
      const title = await page.title();
      const html = await page.content();
      const text = await this.extractTextContent(page);
      const links = await this.extractLinks(page);
      
      // Evaluate custom script if provided
      let customData = null;
      if (puppeteerConfig.evaluateOnPage) {
        customData = await page.evaluate(puppeteerConfig.evaluateOnPage);
      }
      
      // Get page metrics
      const metrics = await page.metrics();
      
      return {
        url,
        title,
        text,
        links,
        html,
        screenshot,
        customData,
        metrics: {
          jsHeapSize: metrics.JSHeapUsedSize,
          jsHeapTotalSize: metrics.JSHeapTotalSize,
          nodes: metrics.Nodes,
          scripts: null, // Not directly available in metrics
          styleSheets: null // Not directly available in metrics
        },
        error: null
      };
    } catch (error: any) {
      return {
        url,
        error: error.message
      };
    } finally {
      // Close the page
      await page.close();
    }
  }
  
  /**
   * Execute the scraping operation
   */
  protected async doScrape(): Promise<ScrapingResult> {
    try {
      const puppeteerConfig = this.config as PuppeteerConfig;
      
      // Scrape each URL
      const results = [];
      const errors = [];
      
      for (const url of puppeteerConfig.urls || []) {
        const result = await this.scrapeUrl(url);
        results.push(result);
        
        if (result.error) {
          errors.push(`Error scraping ${url}: ${result.error}`);
        }
        
        if (this.shouldCancel()) {
          break;
        }
      }
      
      // Close the browser
      if (this.browser) {
        await this.closeBrowser(this.browser);
      }
      
      // Check if there were any errors
      if (errors.length > 0 && errors.length === puppeteerConfig.urls!.length) {
        // All URLs failed
        return this.createErrorResult(errors.join('\n'));
      } else if (errors.length > 0) {
        // Some URLs failed
        return this.createPartialResult(results, puppeteerConfig.urls![0], errors.join('\n'));
      }
      
      // All URLs succeeded
      return this.createSuccessResult(results, puppeteerConfig.urls![0]);
    } catch (error: any) {
      // Close the browser if there was an error
      if (this.browser) {
        await this.closeBrowser(this.browser);
      }
      
      return this.createErrorResult(error.message);
    }
  }
  
  /**
   * Cancel the scraping operation
   */
  protected async doCancel(): Promise<boolean> {
    if (this.browser) {
      await this.closeBrowser(this.browser);
      return true;
    }
    
    return true;
  }
}