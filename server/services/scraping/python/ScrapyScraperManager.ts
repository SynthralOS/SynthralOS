import { BasePythonScraper } from './BasePythonScraper';
import { ScraperType, ScrapyConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Scrapy Scraper Manager
 * Manages Scrapy spiders for web scraping
 */
export class ScrapyScraperManager extends BasePythonScraper {
  protected currentSpiderName?: string;
  
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
    return 'scrapy_manager.py';
  }
  
  /**
   * Validate the scraper configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const scrapyConfig = config as ScrapyConfig;
    
    if (!scrapyConfig.spiderName) {
      errors.push('Spider name is required for Scrapy scraper');
    }
    
    if (!scrapyConfig.urls || scrapyConfig.urls.length === 0) {
      errors.push('At least one URL is required for Scrapy scraper');
    }
    
    return errors;
  }
  
  /**
   * Generate the Scrapy manager script
   */
  protected async generateScript(): Promise<string> {
    return `#!/usr/bin/env python3
import sys
import os
import json
import argparse
import tempfile
import logging
import subprocess
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from scrapy import Spider, Request
from scrapy.http import Response
from scrapy.item import Item, Field
from scrapy.linkextractors import LinkExtractor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('scrapy_manager')

# Define basic scraped item
class ScrapedItem(Item):
    url = Field()
    title = Field()
    content = Field()
    links = Field()
    headers = Field()
    html = Field()
    metadata = Field()

# Dynamic spider class
class DynamicSpider(Spider):
    name = 'dynamic_spider'
    
    def __init__(self, name=None, **kwargs):
        if name:
            self.name = name
        self.start_urls = kwargs.get('start_urls', [])
        self.allowed_domains = kwargs.get('allowed_domains', None)
        self.follow_links = kwargs.get('follow_links', False)
        self.depth = kwargs.get('depth', 1)
        self.parse_rules = kwargs.get('parse_rules', {})
        self.custom_settings = kwargs.get('custom_settings', {})
        super(DynamicSpider, self).__init__(name, **kwargs)
    
    def start_requests(self):
        for url in self.start_urls:
            yield Request(url=url, callback=self.parse, meta={'depth': 0})
    
    def parse(self, response):
        depth = response.meta.get('depth', 0)
        
        # Extract data based on parse rules
        data = {
            'url': response.url,
            'title': self.extract_data(response, self.parse_rules.get('title', 'title::text')),
            'content': self.extract_data(response, self.parse_rules.get('content', 'body::text')),
            'links': [],
            'headers': dict(response.headers),
            'html': response.text,
            'metadata': {}
        }
        
        # Extract additional fields from parse rules
        for field, selector in self.parse_rules.items():
            if field not in ['title', 'content']:
                data['metadata'][field] = self.extract_data(response, selector)
        
        # Extract links
        if self.follow_links and depth < self.depth:
            link_extractor = LinkExtractor()
            links = link_extractor.extract_links(response)
            data['links'] = [link.url for link in links]
            
            # Follow links if needed
            for link in links:
                yield Request(
                    url=link.url, 
                    callback=self.parse, 
                    meta={'depth': depth + 1}
                )
        
        # Return scraped item
        item = ScrapedItem()
        for key, value in data.items():
            item[key] = value
        yield item
    
    def extract_data(self, response, selector):
        try:
            if '::' in selector:
                selector_parts = selector.split('::')
                if len(selector_parts) == 2:
                    element, attr = selector_parts
                    if attr == 'text':
                        return response.css(element).get() or response.xpath(element).get() or ''
                    else:
                        return response.css(f'{element}::{attr}').get() or response.xpath(f'{element}/@{attr}').get() or ''
            return response.css(selector).getall() or response.xpath(selector).getall() or []
        except Exception as e:
            logger.error(f"Error extracting data with selector {selector}: {str(e)}")
            return []

class ScrapyManager:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp()
        self.settings = get_project_settings()
        self.configure_settings()
    
    def configure_settings(self):
        self.settings.set('FEEDS', {
            os.path.join(self.temp_dir, 'output.json'): {
                'format': 'json',
                'encoding': 'utf8',
                'store_empty': False
            }
        })
        self.settings.set('LOG_LEVEL', 'INFO')
        self.settings.set('USER_AGENT', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
        
    def update_settings(self, custom_settings):
        for key, value in custom_settings.items():
            self.settings.set(key, value)
            
    def create_spider(self, config):
        # Extract configuration parameters
        spider_name = config.get('spiderName', 'dynamic_spider')
        start_urls = config.get('urls', [])
        allowed_domains = config.get('allowedDomains', None)
        follow_links = config.get('followLinks', False)
        depth = config.get('depth', 1)
        parse_rules = config.get('parseRules', {})
        custom_settings = config.get('customSettings', {})
        
        # Update Scrapy settings with custom settings
        self.update_settings(custom_settings)
        
        # Return spider class with configuration
        return DynamicSpider(
            name=spider_name,
            start_urls=start_urls,
            allowed_domains=allowed_domains,
            follow_links=follow_links,
            depth=depth,
            parse_rules=parse_rules,
            custom_settings=custom_settings
        )
    
    def run_spider(self, config):
        spider = self.create_spider(config)
        
        # Create crawler process
        process = CrawlerProcess(self.settings)
        process.crawl(spider)
        process.start()
        
        # Load and return scraped data
        output_file = os.path.join(self.temp_dir, 'output.json')
        if os.path.exists(output_file):
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            # Clean up
            os.remove(output_file)
            return data
        
        return []

def main():
    parser = argparse.ArgumentParser(description='Scrapy Manager')
    parser.add_argument('--input', type=str, help='Path to JSON config file')
    args = parser.parse_args()
    
    try:
        # Load configuration
        config = {}
        if args.input and os.path.exists(args.input):
            with open(args.input, 'r', encoding='utf-8') as f:
                config = json.load(f)
        
        # Run spider
        manager = ScrapyManager()
        result = manager.run_spider(config)
        
        # Output results as JSON
        print(json.dumps({
            'status': 'success',
            'data': result
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
      this.currentSpiderName = scrapyConfig.spiderName;
      
      // Convert config to Python-compatible format
      const pythonConfig = {
        spiderName: scrapyConfig.spiderName,
        urls: scrapyConfig.urls,
        allowedDomains: scrapyConfig.allowedDomains,
        followLinks: scrapyConfig.followLinks,
        depth: scrapyConfig.depth,
        parseRules: scrapyConfig.parseRules,
        customSettings: scrapyConfig.customSettings
      };
      
      // Run the Python script
      const result = await this.runPythonScriptWithJson(pythonConfig);
      
      if (result.status === 'error') {
        return this.createErrorResult(result.error || 'Unknown error in Scrapy script');
      }
      
      // Process and return data
      return this.createSuccessResult(result.data, scrapyConfig.urls[0]);
    } catch (error: any) {
      return this.createErrorResult(error.message || 'Failed to execute Scrapy scraper');
    } finally {
      this.currentSpiderName = undefined;
    }
  }
}