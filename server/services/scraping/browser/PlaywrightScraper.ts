import { BaseBrowserScraper } from './BaseBrowserScraper';
import { ScraperType, PlaywrightConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import * as playwright from 'playwright';

/**
 * Playwright Scraper
 * Browser automation for JS-heavy sites with multiple engine support
 */
export class PlaywrightScraper extends BaseBrowserScraper {
  private browser?: playwright.Browser;
  private context?: playwright.BrowserContext;
  
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.PLAYWRIGHT;
  }
  
  /**
   * Validate the configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const playwrightConfig = config as PlaywrightConfig;
    
    if (!playwrightConfig.browserType) {
      errors.push('Browser type is required for Playwright scraper');
    } else if (!['chromium', 'firefox', 'webkit'].includes(playwrightConfig.browserType)) {
      errors.push('Browser type must be one of: chromium, firefox, webkit');
    }
    
    if (!playwrightConfig.urls || playwrightConfig.urls.length === 0) {
      errors.push('At least one URL is required for Playwright scraper');
    }
    
    return errors;
  }
  
  /**
   * Launch the browser
   */
  protected async launchBrowser(): Promise<playwright.Browser> {
    const playwrightConfig = this.config as PlaywrightConfig;
    const browserType = playwrightConfig.browserType || 'chromium';
    const headless = playwrightConfig.headless !== false; // Default to headless
    
    // Launch the browser
    this.browser = await playwright[browserType].launch({
      headless,
    });
    
    this.browserProcess = this.browser;
    return this.browser;
  }
  
  /**
   * Create a new page in the browser
   */
  protected async createPage(browser: playwright.Browser): Promise<playwright.Page> {
    const playwrightConfig = this.config as PlaywrightConfig;
    
    // Create a new context
    this.context = await browser.newContext({
      viewport: playwrightConfig.viewport ? 
        { width: 1280, height: 720 } : 
        undefined,
      userAgent: playwrightConfig.headers?.['User-Agent']
    });
    
    // Create a new page
    const page = await this.context.newPage();
    
    // Set up request interception if needed
    if (playwrightConfig.interceptRequests) {
      await this.setupRequestInterception(page);
    }
    
    return page;
  }
  
  /**
   * Setup request interception
   */
  private async setupRequestInterception(page: playwright.Page): Promise<void> {
    const playwrightConfig = this.config as PlaywrightConfig;
    
    if (playwrightConfig.blockResources) {
      // Block specified resource types
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (playwrightConfig.blockResources?.includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });
    }
  }
  
  /**
   * Navigate to a URL
   */
  protected async navigateTo(page: playwright.Page, url: string): Promise<void> {
    const playwrightConfig = this.config as PlaywrightConfig;
    
    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: playwrightConfig.timeout || 30000
    });
    
    // Wait for selector if specified
    if (playwrightConfig.waitForSelector) {
      await page.waitForSelector(playwrightConfig.waitForSelector, {
        timeout: playwrightConfig.timeout || 30000
      });
    }
    
    // Run custom scripts if provided
    if (playwrightConfig.scripts && playwrightConfig.scripts.length > 0) {
      for (const script of playwrightConfig.scripts) {
        await page.evaluate(script);
      }
    }
  }
  
  /**
   * Extract text content from a page
   */
  protected async extractTextContent(page: playwright.Page): Promise<string> {
    return await page.evaluate(() => {
      return document.body.innerText;
    });
  }
  
  /**
   * Extract links from a page
   */
  protected async extractLinks(page: playwright.Page): Promise<string[]> {
    return await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .map(a => a.href)
        .filter(href => href && href.startsWith('http'));
    });
  }
  
  /**
   * Close the browser
   */
  protected async closeBrowser(browser: playwright.Browser): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = undefined;
    }
    
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
   * Scrape a URL using Playwright
   */
  private async scrapeUrl(url: string): Promise<any> {
    const playwrightConfig = this.config as PlaywrightConfig;
    
    // Launch browser if not already launched
    if (!this.browser) {
      this.browser = await this.launchBrowser();
    }
    
    // Create a new page
    const page = await this.createPage(this.browser);
    
    try {
      // Navigate to the URL
      await this.navigateTo(page, url);
      
      // Take a screenshot if enabled
      let screenshot = null;
      if (playwrightConfig.screenshots) {
        const screenshotPath = await this.saveScreenshot(page, new URL(url).hostname);
        screenshot = await this.screenshotToBase64(screenshotPath);
      }
      
      // Extract data
      const title = await page.title();
      const html = await page.content();
      const text = await this.extractTextContent(page);
      const links = await this.extractLinks(page);
      
      // Get page metrics
      const metrics = await page.evaluate(() => {
        return {
          jsHeapSize: (window as any).performance?.memory?.usedJSHeapSize || 0,
          domNodes: document.querySelectorAll('*').length,
          scripts: document.querySelectorAll('script').length,
          styleSheets: document.querySelectorAll('link[rel="stylesheet"]').length,
          images: document.querySelectorAll('img').length
        };
      });
      
      return {
        url,
        title,
        text,
        links,
        html,
        screenshot,
        metrics,
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
      const playwrightConfig = this.config as PlaywrightConfig;
      
      // Scrape each URL
      const results = [];
      const errors = [];
      
      for (const url of playwrightConfig.urls || []) {
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
      if (errors.length > 0 && errors.length === playwrightConfig.urls!.length) {
        // All URLs failed
        return this.createErrorResult(errors.join('\n'));
      } else if (errors.length > 0) {
        // Some URLs failed
        return this.createPartialResult(results, playwrightConfig.urls![0], errors.join('\n'));
      }
      
      // All URLs succeeded
      return this.createSuccessResult(results, playwrightConfig.urls![0]);
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