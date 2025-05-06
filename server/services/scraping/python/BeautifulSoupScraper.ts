import { BasePythonScraper } from './BasePythonScraper';
import { BeautifulSoupConfig, ScraperType } from '../types';

/**
 * BeautifulSoup scraper implementation
 */
export class BeautifulSoupScraper extends BasePythonScraper {
  protected config: BeautifulSoupConfig;
  
  /**
   * Constructor for BeautifulSoup scraper
   * 
   * @param config The BeautifulSoup scraper configuration
   */
  constructor(config: BeautifulSoupConfig) {
    super(config);
    this.config = config;
  }
  
  /**
   * Generate Python script for BeautifulSoup scraping
   */
  protected generatePythonScript(): string {
    // Default headers if not provided
    const headers = this.config.headers || {
      'User-Agent': this.config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };
    
    // Prepare selectors
    const selectors = JSON.stringify(this.config.selectors);
    
    // Generate the Python script
    return `
import json
import requests
from bs4 import BeautifulSoup
import time
import random
import sys

# Configuration
url = "${this.config.url}"
headers = ${JSON.stringify(headers)}
selectors = ${selectors}
timeout = ${this.config.timeout || 30}
request_delay = ${this.config.requestDelay || 0}
output_path = "${this.outputPath.replace(/\\/g, '\\\\')}"
parse_js = ${this.config.parseJs ? 'True' : 'False'}
encoding = "${this.config.encoding || 'utf-8'}"

# Add delay if configured
if request_delay > 0:
    delay = request_delay + (random.random() * request_delay * 0.5)  # Add jitter
    time.sleep(delay)

try:
    # Make the request
    print(f"Fetching {url}...")
    response = requests.get(url, headers=headers, timeout=timeout)
    response.raise_for_status()
    
    # Set encoding
    if encoding:
        response.encoding = encoding
    
    # Parse HTML
    print("Parsing HTML...")
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract data using selectors
    result = {}
    
    for key, selector in selectors.items():
        elements = soup.select(selector)
        
        if len(elements) == 1:
            # Single element handling
            element = elements[0]
            if element.name == 'a':
                result[key] = {
                    'text': element.get_text(strip=True),
                    'href': element.get('href', '')
                }
            elif element.name == 'img':
                result[key] = {
                    'alt': element.get('alt', ''),
                    'src': element.get('src', '')
                }
            else:
                result[key] = element.get_text(strip=True)
        else:
            # Multiple elements handling (create array)
            result[key] = []
            for element in elements:
                if element.name == 'a':
                    result[key].append({
                        'text': element.get_text(strip=True),
                        'href': element.get('href', '')
                    })
                elif element.name == 'img':
                    result[key].append({
                        'alt': element.get('alt', ''),
                        'src': element.get('src', '')
                    })
                else:
                    result[key].append(element.get_text(strip=True))
    
    # Add metadata
    result['__metadata'] = {
        'timestamp': time.time(),
        'url': url,
        'status_code': response.status_code,
        'headers': dict(response.headers),
        'content_length': len(response.content)
    }
    
    # Save to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"Scraping completed and saved to {output_path}")
    
except Exception as e:
    error_data = {
        'error': str(e),
        'type': type(e).__name__,
        '__metadata': {
            'timestamp': time.time(),
            'url': url
        }
    }
    
    # Save error to file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(error_data, f, ensure_ascii=False, indent=2)
    
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }
  
  /**
   * Override validateConfig to check for BeautifulSoup specific requirements
   */
  protected validateConfig(): boolean {
    return super.validateConfig() 
      && !!this.config.selectors 
      && Object.keys(this.config.selectors).length > 0;
  }
}