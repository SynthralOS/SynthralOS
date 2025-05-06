import { BaseScraper } from '../BaseScraper';
import { ScraperType, AnyScraperConfig, ScrapingResult } from '../types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * Base class for browser-based scrapers
 * Provides common functionality for Playwright, Puppeteer, and other browser automation tools
 */
export abstract class BaseBrowserScraper extends BaseScraper {
  protected browserProcess: any = null;
  protected screenshotsDir: string;
  
  constructor() {
    super();
    
    // Create screenshots directory
    this.screenshotsDir = path.join(os.tmpdir(), 'synthralos-screenshots');
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }
  
  /**
   * Take a screenshot and save it to the screenshots directory
   */
  protected async saveScreenshot(page: any, name: string): Promise<string> {
    const filename = `${name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.png`;
    const filepath = path.join(this.screenshotsDir, filename);
    
    await page.screenshot({ path: filepath, fullPage: true });
    return filepath;
  }
  
  /**
   * Convert a screenshot to base64
   */
  protected async screenshotToBase64(filepath: string): Promise<string> {
    const buffer = await fs.promises.readFile(filepath);
    return buffer.toString('base64');
  }
  
  /**
   * Clean up and cancel any running browser processes
   */
  protected async doCancel(): Promise<boolean> {
    if (this.browserProcess) {
      try {
        await this.browserProcess.close();
        this.browserProcess = null;
        return true;
      } catch (error) {
        console.error('Error closing browser:', error);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Extract text content from a page
   */
  protected abstract extractTextContent(page: any): Promise<string>;
  
  /**
   * Extract links from a page
   */
  protected abstract extractLinks(page: any): Promise<string[]>;
  
  /**
   * Launch the browser
   */
  protected abstract launchBrowser(): Promise<any>;
  
  /**
   * Create a new page in the browser
   */
  protected abstract createPage(browser: any): Promise<any>;
  
  /**
   * Navigate to a URL
   */
  protected abstract navigateTo(page: any, url: string): Promise<void>;
  
  /**
   * Close the browser
   */
  protected abstract closeBrowser(browser: any): Promise<void>;
}