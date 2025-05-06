import { BasePythonScraper } from './BasePythonScraper';
import { ScraperType, ScrapyConfig, ScrapingResult, AnyScraperConfig } from '../types';

/**
 * Scrapy Scraper
 * Comprehensive Python web crawling framework
 */
export class ScrapyScraper extends BasePythonScraper {
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.SCRAPY;
  }
  
  /**
   * Get the Python script name for this scraper
   */
  protected getScriptName(): string {
    return 'scrapy_scraper.py';
  }
  
  /**
   * Validate the scraper configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const scrapyConfig = config as ScrapyConfig;
    
    if (!scrapyConfig.startUrls || scrapyConfig.startUrls.length === 0) {
      errors.push('At least one start URL is required for Scrapy scraper');
    }
    
    if (scrapyConfig.maxDepth !== undefined && (isNaN(scrapyConfig.maxDepth) || scrapyConfig.maxDepth < 0)) {
      errors.push('Max depth must be a positive number');
    }
    
    return errors;
  }
  
  /**
   * Generate the Scrapy scraper script
   */
  protected async generateScript(): Promise<string> {
    return `#!/usr/bin/env python3
import sys
import os
import json
import argparse
import logging
import time
import tempfile
import re
from urllib.parse import urlparse
import scrapy
from scrapy.crawler import CrawlerProcess
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from scrapy.http import Request
from scrapy.utils.project import get_project_settings
import scrapy.signals
from scrapy.signalmanager import dispatcher

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('scrapy_scraper')

class GeneralSpider(CrawlSpider):
    """General-purpose Scrapy spider that can be configured at runtime"""
    name = 'general_spider'
    
    def __init__(self, config=None, *args, **kwargs):
        self.config = config or {}
        self.results = []
        self.parsed_urls = set()
        
        # Set start URLs
        self.start_urls = self.config.get('startUrls', [])
        
        # Set allowed domains (optional)
        allowed_domains = self.config.get('allowedDomains', [])
        if not allowed_domains and self.start_urls:
            # Extract domains from start URLs if not provided
            for url in self.start_urls:
                domain = urlparse(url).netloc
                if domain:
                    allowed_domains.append(domain)
        
        self.allowed_domains = allowed_domains
        
        # Max depth control
        self.max_depth = self.config.get('maxDepth', 1)
        
        # Set up rules
        rules = []
        
        # URL patterns
        allow_patterns = self.config.get('allowedPatterns', [])
        deny_patterns = self.config.get('deniedPatterns', [])
        
        # Add rule for following links
        rules.append(
            Rule(
                LinkExtractor(
                    allow=allow_patterns if allow_patterns else None,
                    deny=deny_patterns if deny_patterns else None,
                    restrict_xpaths=self.config.get('followSelectors', [])
                ),
                callback='parse_item',
                follow=True,
                process_links='filter_links'
            )
        )
        
        self._rules = tuple(rules)
        
        super().__init__(*args, **kwargs)
    
    def filter_links(self, links):
        """Filter links based on max depth"""
        # First request is depth 0, so max depth 1 means follow one level of links
        if self.crawler.engine.slot.depth >= self.max_depth:
            return []
        return links
    
    def start_requests(self):
        """Start requests with custom headers and cookies if provided"""
        headers = self.config.get('headers', {})
        cookies = self.config.get('cookies', {})
        
        for url in self.start_urls:
            yield Request(
                url=url,
                callback=self.parse_item,
                headers=headers,
                cookies=cookies,
                meta={'depth': 0}
            )
    
    def parse_item(self, response):
        """Parse a page and extract structured data"""
        url = response.url
        
        # Skip if already parsed
        if url in self.parsed_urls:
            return
        
        self.parsed_urls.add(url)
        
        try:
            # Extract data
            result = {
                'url': url,
                'title': response.css('title::text').get(),
                'html': response.text,
                'status': response.status,
                'depth': response.meta.get('depth', 0),
            }
            
            # Extract text content
            content = ' '.join(response.css('body ::text').getall())
            content = re.sub(r'\\s+', ' ', content).strip()
            result['text'] = content
            
            # Extract metadata
            metadata = {}
            for meta in response.css('meta'):
                name = meta.css('::attr(name)').get() or meta.css('::attr(property)').get()
                if name:
                    content = meta.css('::attr(content)').get()
                    metadata[name] = content
            
            result['metadata'] = metadata
            
            # Extract links
            result['links'] = [link for link in response.css('a::attr(href)').getall()]
            
            # Extract custom selectors
            if 'itemSelectors' in self.config:
                extracted = {}
                for name, selector in self.config['itemSelectors'].items():
                    # Handle different selector types (CSS, XPath)
                    if selector.startswith('//'):
                        # XPath selector
                        values = response.xpath(selector).getall()
                    else:
                        # CSS selector
                        values = response.css(selector).getall()
                    
                    extracted[name] = values
                
                result['extracted'] = extracted
            
            # Add to results
            self.results.append(result)
            
            logger.info(f"Parsed: {url}")
            return result
            
        except Exception as e:
            logger.error(f"Error parsing {url}: {str(e)}")
            self.results.append({
                'url': url,
                'error': str(e)
            })
    
    @classmethod
    def from_crawler(cls, crawler, *args, **kwargs):
        """Connect to signals for monitoring"""
        spider = super().from_crawler(crawler, *args, **kwargs)
        crawler.signals.connect(spider.spider_closed, signal=scrapy.signals.spider_closed)
        return spider
    
    def spider_closed(self, spider):
        """Handle spider closed signal"""
        logger.info("Spider closed: %s", spider.name)

def run_scrapy_spider(config):
    """Run the Scrapy spider with the given configuration"""
    results = []
    
    # Function to collect the results when spider finishes
    def spider_closed(spider):
        nonlocal results
        results = spider.results
    
    # Connect to the spider closed signal
    dispatcher.connect(spider_closed, signal=scrapy.signals.spider_closed)
    
    # Create a settings dictionary
    settings = get_project_settings()
    settings.update({
        'USER_AGENT': config.get('headers', {}).get('User-Agent', 
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
        'ROBOTSTXT_OBEY': config.get('obeyRobotsTxt', True),
        'CONCURRENT_REQUESTS': config.get('concurrentRequests', 16),
        'DOWNLOAD_TIMEOUT': config.get('timeout', 30),
        'RETRY_TIMES': config.get('maxRetries', 3),
        'AUTOTHROTTLE_ENABLED': config.get('autoThrottle', True),
        'AUTOTHROTTLE_START_DELAY': config.get('autothrottleStartDelay', 1),
        'AUTOTHROTTLE_MAX_DELAY': config.get('autothrottleMaxDelay', 10),
        'LOG_LEVEL': 'INFO',
    })
    
    # Update with any custom settings provided
    if 'customSettings' in config:
        settings.update(config['customSettings'])
    
    # Create the crawler process
    process = CrawlerProcess(settings)
    
    # Create and configure the spider
    process.crawl(GeneralSpider, config=config)
    
    # Run the spider
    process.start()  # This blocks until the crawl is finished
    
    return results

def main():
    parser = argparse.ArgumentParser(description='Scrapy Web Scraper')
    parser.add_argument('--input', type=str, help='Path to JSON config file')
    args = parser.parse_args()
    
    try:
        # Load configuration
        config = {}
        if args.input and os.path.exists(args.input):
            with open(args.input, 'r', encoding='utf-8') as f:
                config = json.load(f)
        
        # Run scraper
        logger.info("Starting Scrapy spider")
        results = run_scrapy_spider(config)
        
        # Output results as JSON
        print(json.dumps({
            'status': 'success',
            'data': results
        }))
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        # Output error as JSON
        print(json.dumps({
            'status': 'error',
            'error': str(e)
        }))
        sys.exit(1)

if __name__ == '__main__':
    main()
`;
  }
  
  /**
   * Execute the scraping operation
   */
  protected async doScrape(): Promise<ScrapingResult> {
    try {
      const scrapyConfig = this.config as ScrapyConfig;
      
      // Convert config to Python-compatible format
      const pythonConfig = {
        startUrls: scrapyConfig.startUrls,
        allowedDomains: scrapyConfig.allowedDomains || [],
        maxDepth: scrapyConfig.maxDepth || 1,
        allowedPatterns: scrapyConfig.allowedPatterns || [],
        deniedPatterns: scrapyConfig.deniedPatterns || [],
        itemSelectors: scrapyConfig.itemSelectors || {},
        followSelectors: scrapyConfig.followSelectors || [],
        customSettings: scrapyConfig.customSettings || {},
        obeyRobotsTxt: scrapyConfig.customSettings?.ROBOTSTXT_OBEY !== false,
        concurrentRequests: scrapyConfig.customSettings?.CONCURRENT_REQUESTS || 16,
        timeout: scrapyConfig.timeout || this.config.timeout || 30,
        maxRetries: scrapyConfig.maxRetries || this.config.maxRetries || 3,
        autoThrottle: scrapyConfig.customSettings?.AUTOTHROTTLE_ENABLED !== false,
        headers: this.config.headers || {},
        cookies: this.config.cookies || {}
      };
      
      // Run the Python script
      const result = await this.runPythonScriptWithJson(pythonConfig);
      
      if (result.status === 'error') {
        return this.createErrorResult(result.error || 'Unknown error in Scrapy script');
      }
      
      // Check if there are any errors in the results
      const hasErrors = result.data.some((item: any) => item.error);
      
      if (hasErrors && result.data.every((item: any) => item.error)) {
        // All URLs failed
        const errors = result.data
          .filter((item: any) => item.error)
          .map((item: any) => `Error scraping ${item.url}: ${item.error}`)
          .join('\n');
        return this.createErrorResult(errors);
      } else if (hasErrors) {
        // Some URLs failed
        const errors = result.data
          .filter((item: any) => item.error)
          .map((item: any) => `Error scraping ${item.url}: ${item.error}`)
          .join('\n');
        
        const successResults = result.data.filter((item: any) => !item.error);
        return this.createPartialResult(successResults, scrapyConfig.startUrls[0], errors);
      }
      
      // All URLs were scraped successfully
      return this.createSuccessResult(result.data, scrapyConfig.startUrls[0]);
    } catch (error: any) {
      return this.createErrorResult(error.message || 'Failed to execute Scrapy scraper');
    }
  }
}