import { BaseScraper } from './BaseScraper';
import { BeautifulSoupScraper } from './python/BeautifulSoupScraper';
import { ScraperType, AnyScraperConfig } from './types';

/**
 * Factory class for creating different scraper instances
 */
export class ScraperFactory {
  private static instance: ScraperFactory;

  /**
   * Get the singleton instance of ScraperFactory
   */
  public static getInstance(): ScraperFactory {
    if (!ScraperFactory.instance) {
      ScraperFactory.instance = new ScraperFactory();
    }
    return ScraperFactory.instance;
  }

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Check if a scraper type is supported
   */
  public isTypeSupported(type: ScraperType): boolean {
    const supportedTypes: ScraperType[] = [
      ScraperType.BeautifulSoup,
      // Add more supported scraper types as they are implemented
    ];
    return supportedTypes.includes(type);
  }

  /**
   * Create a scraper instance based on type and configuration
   */
  public async createScraper(type: ScraperType, config: AnyScraperConfig): Promise<BaseScraper> {
    switch (type) {
      case ScraperType.BeautifulSoup:
        return new BeautifulSoupScraper(config);
      
      // Add cases for other scraper types as they are implemented
      
      default:
        throw new Error(`Unsupported scraper type: ${type}`);
    }
  }
}