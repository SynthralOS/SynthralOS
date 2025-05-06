import { BasePythonScraper } from '../python/BasePythonScraper';
import { ScraperType, UndetectedChromeConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Undetected Chrome Scraper
 * Anti-detection Chrome automation for bypassing bot protections
 */
export class UndetectedChromeScraper extends BasePythonScraper {
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.UNDETECTED_CHROME;
  }
  
  /**
   * Get the Python script name for this scraper
   */
  protected getScriptName(): string {
    return 'undetected_chrome_scraper.py';
  }
  
  /**
   * Validate the scraper configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const ucConfig = config as UndetectedChromeConfig;
    
    if (!ucConfig.urls || ucConfig.urls.length === 0) {
      errors.push('At least one URL is required for Undetected Chrome scraper');
    }
    
    return errors;
  }
  
  /**
   * Generate the Undetected Chrome scraper script
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
import base64
from urllib.parse import urlparse
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('undetected_chrome_scraper')

class UndetectedChromeScraper:
    def __init__(self, config):
        self.config = config
        self.urls = config.get('urls', [])
        self.timeout = config.get('timeout', 30)
        self.max_retries = config.get('maxRetries', 3)
        self.options = config.get('options', {})
        self.version = config.get('version')
        self.headers = config.get('headers', {})
        self.screenshot_dir = tempfile.mkdtemp()
        self.patch_payload = config.get('patchPayload', True)
        self.use_devtools_protocol = config.get('useDevToolsProtocol', False)
        self.suppress_welcome = config.get('suppressWelcome', True)
        
        # Create driver options
        chrome_options = self._create_chrome_options()
        
        # Initialize driver
        self.driver = self._create_driver(chrome_options)
    
    def _create_chrome_options(self):
        # Set up Chrome options
        chrome_options = uc.ChromeOptions()
        
        # Add default options
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        
        # Add custom headers if provided
        if self.headers.get('User-Agent'):
            chrome_options.add_argument(f'--user-agent={self.headers["User-Agent"]}')
        
        # Add custom options if provided
        for option_name, option_value in self.options.items():
            if option_value is True:
                chrome_options.add_argument(f'--{option_name}')
            elif option_value is not False and option_value is not None:
                chrome_options.add_argument(f'--{option_name}={option_value}')
        
        return chrome_options
    
    def _create_driver(self, chrome_options):
        # Create undetected-chromedriver with options
        driver_kwargs = {
            'options': chrome_options,
            'version_main': self.version,
            'suppress_welcome': self.suppress_welcome,
            'use_subprocess': True,
        }
        
        # Add optional kwargs
        if self.patch_payload is not None:
            driver_kwargs['patch_fp'] = self.patch_payload
            
        if self.use_devtools_protocol is not None:
            driver_kwargs['use_cdp'] = self.use_devtools_protocol
        
        try:
            logger.info("Initializing Undetected ChromeDriver")
            driver = uc.Chrome(**driver_kwargs)
            driver.set_page_load_timeout(self.timeout)
            return driver
        except Exception as e:
            logger.error(f"Error initializing ChromeDriver: {str(e)}")
            raise
    
    def _take_screenshot(self, url):
        """Take a screenshot and convert to base64"""
        try:
            hostname = urlparse(url).netloc.replace('.', '_')
            filename = f"{hostname}_{int(time.time())}.png"
            filepath = os.path.join(self.screenshot_dir, filename)
            
            self.driver.save_screenshot(filepath)
            
            # Convert to base64
            with open(filepath, 'rb') as f:
                screenshot = base64.b64encode(f.read()).decode('utf-8')
            
            # Clean up the file
            os.remove(filepath)
            
            return screenshot
        except Exception as e:
            logger.error(f"Error taking screenshot: {str(e)}")
            return None
    
    def _extract_text_content(self):
        """Extract text content from the page"""
        try:
            return self.driver.execute_script("return document.body.innerText")
        except Exception as e:
            logger.error(f"Error extracting text content: {str(e)}")
            return ""
    
    def _extract_links(self):
        """Extract links from the page"""
        try:
            links = self.driver.execute_script("""
                return Array.from(document.querySelectorAll('a'))
                    .map(a => a.href)
                    .filter(href => href && href.startsWith('http'));
            """)
            return links
        except Exception as e:
            logger.error(f"Error extracting links: {str(e)}")
            return []
    
    def _extract_page_metrics(self):
        """Extract page performance metrics"""
        try:
            metrics = self.driver.execute_script("""
                return {
                    domNodes: document.querySelectorAll('*').length,
                    scripts: document.querySelectorAll('script').length,
                    styles: document.querySelectorAll('link[rel="stylesheet"], style').length,
                    images: document.querySelectorAll('img').length,
                    iframes: document.querySelectorAll('iframe').length
                }
            """)
            return metrics
        except Exception as e:
            logger.error(f"Error extracting page metrics: {str(e)}")
            return {}
    
    def scrape_url(self, url):
        """Scrape a single URL"""
        logger.info(f"Scraping URL: {url}")
        
        # Initialize result dictionary
        result = {
            'url': url,
            'title': '',
            'text': '',
            'links': [],
            'html': '',
            'screenshot': None,
            'metrics': {},
            'error': None
        }
        
        # Scrape with retries
        for attempt in range(self.max_retries):
            try:
                # Navigate to URL
                logger.info(f"Navigating to {url} (attempt {attempt + 1}/{self.max_retries})")
                self.driver.get(url)
                
                # Wait for page to load
                WebDriverWait(self.driver, self.timeout).until(
                    EC.presence_of_element_located((By.TAG_NAME, 'body'))
                )
                
                # Extract data
                result['title'] = self.driver.title
                result['text'] = self._extract_text_content()
                result['links'] = self._extract_links()
                result['html'] = self.driver.page_source
                result['screenshot'] = self._take_screenshot(url)
                result['metrics'] = self._extract_page_metrics()
                
                # Successful scrape
                break
                
            except TimeoutException:
                error = f"Timeout while loading {url}"
                logger.warning(error)
                if attempt == self.max_retries - 1:
                    result['error'] = error
                else:
                    time.sleep(1)
                    
            except WebDriverException as e:
                error = f"WebDriver error: {str(e)}"
                logger.warning(error)
                if attempt == self.max_retries - 1:
                    result['error'] = error
                else:
                    time.sleep(1)
                    
            except Exception as e:
                error = f"Error: {str(e)}"
                logger.error(error)
                result['error'] = error
                break
        
        return result
    
    def scrape(self):
        """Scrape all URLs"""
        results = []
        
        try:
            for url in self.urls:
                result = self.scrape_url(url)
                results.append(result)
        finally:
            # Close the driver
            try:
                self.driver.quit()
            except Exception as e:
                logger.warning(f"Error closing driver: {str(e)}")
        
        return results

def main():
    parser = argparse.ArgumentParser(description='Undetected Chrome Scraper')
    parser.add_argument('--input', type=str, help='Path to JSON config file')
    args = parser.parse_args()
    
    try:
        # Load configuration
        config = {}
        if args.input and os.path.exists(args.input):
            with open(args.input, 'r', encoding='utf-8') as f:
                config = json.load(f)
        
        # Run scraper
        scraper = UndetectedChromeScraper(config)
        results = scraper.scrape()
        
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
      const ucConfig = this.config as UndetectedChromeConfig;
      
      // Convert config to Python-compatible format
      const pythonConfig = {
        urls: ucConfig.urls,
        timeout: ucConfig.timeout || this.config.timeout,
        maxRetries: ucConfig.maxRetries || this.config.maxRetries,
        options: ucConfig.options || {},
        version: ucConfig.version,
        headers: this.config.headers || {},
        patchPayload: ucConfig.patchPayload,
        useDevToolsProtocol: ucConfig.useDevToolsProtocol,
        suppressWelcome: ucConfig.suppressWelcome
      };
      
      // Run the Python script
      const result = await this.runPythonScriptWithJson(pythonConfig);
      
      if (result.status === 'error') {
        return this.createErrorResult(result.error || 'Unknown error in Undetected Chrome script');
      }
      
      // Check if there are any errors in the results
      const hasErrors = result.data.some((item: any) => item.error);
      
      if (hasErrors && result.data.every((item: any) => item.error)) {
        // All URLs failed
        const errors = result.data
          .map((item: any) => `Error scraping ${item.url}: ${item.error}`)
          .join('\n');
        return this.createErrorResult(errors);
      } else if (hasErrors) {
        // Some URLs failed
        const errors = result.data
          .filter((item: any) => item.error)
          .map((item: any) => `Error scraping ${item.url}: ${item.error}`)
          .join('\n');
        return this.createPartialResult(result.data, ucConfig.urls[0], errors);
      }
      
      // All URLs were scraped successfully
      return this.createSuccessResult(result.data, ucConfig.urls[0]);
    } catch (error: any) {
      return this.createErrorResult(error.message || 'Failed to execute Undetected Chrome scraper');
    }
  }
}