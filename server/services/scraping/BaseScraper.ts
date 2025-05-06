import { BaseScraperConfig } from './types';

/**
 * Abstract base class for all scrapers
 */
export abstract class BaseScraper {
  protected config: BaseScraperConfig;
  protected startTime: number = 0;
  protected endTime: number = 0;

  /**
   * Constructor for BaseScraper
   * 
   * @param config The base configuration for the scraper
   */
  constructor(config: BaseScraperConfig) {
    this.config = config;
  }

  /**
   * Abstract method for scraping
   * Must be implemented by concrete scraper classes
   */
  public abstract scrape(): Promise<any>;

  /**
   * Get the runtime of the last scraping operation
   * 
   * @returns Runtime in milliseconds
   */
  public getRuntime(): number {
    return this.endTime - this.startTime;
  }

  /**
   * Helper to start timing the scrape operation
   */
  protected startTimer(): void {
    this.startTime = Date.now();
  }

  /**
   * Helper to end timing the scrape operation
   */
  protected endTimer(): void {
    this.endTime = Date.now();
  }

  /**
   * Check if the config is valid
   * 
   * @returns True if valid, false otherwise
   */
  protected validateConfig(): boolean {
    return !!this.config && !!this.config.url;
  }

  /**
   * Sleep for the specified number of milliseconds
   * 
   * @param ms Milliseconds to sleep
   */
  protected async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Handle rate limiting with backoff
   * 
   * @param attempt Current attempt number
   */
  protected async handleRateLimit(attempt: number = 0): Promise<void> {
    const baseDelay = 1000; // 1 second
    const maxAttempts = this.config.retries || 3;
    
    if (attempt >= maxAttempts) {
      throw new Error(`Rate limit exceeded after ${maxAttempts} attempts`);
    }
    
    // Exponential backoff with jitter
    const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
    await this.sleep(delay);
  }
}