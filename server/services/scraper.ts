import axios from 'axios';
import * as cheerio from 'cheerio';
import { log } from '../vite';
import puppeteer from 'puppeteer';
import { JSDOM } from 'jsdom';

// Different scraper engines
export enum ScraperEngine {
  CHEERIO = 'cheerio',           // Lightweight, fast static HTML parser
  JSDOM = 'jsdom',               // DOM implementation for more accurate parsing
  PUPPETEER = 'puppeteer',       // Headless browser for JavaScript rendering
  CRAWL4AI = 'crawl4ai',         // Advanced intelligent extraction with ML capabilities
  SCRAPEGRAPH = 'scrapegraph',   // Visual-based scraping for highly visual sites
  CLOUDSCRAPER = 'cloudscraper'  // Specialized for bypassing Cloudflare and bot protection
}

// Site types for specialized scraping handling
export enum SiteType {
  GENERIC = 'generic',
  E_COMMERCE = 'e_commerce',
  NEWS = 'news',
  SOCIAL_MEDIA = 'social_media',
  FORUM = 'forum',
  JOB_BOARD = 'job_board',
  SPA = 'single_page_app',
  VISUAL = 'visual',             // Highly visual sites like Instagram, Pinterest
  PROTECTED = 'protected'        // Sites with heavy bot protection
}

// Bot protection types
export enum BotProtectionType {
  NONE = 'none',
  CLOUDFLARE = 'cloudflare',
  CAPTCHA = 'captcha',
  RATE_LIMITING = 'rate_limiting',
  JS_CHALLENGE = 'js_challenge',
  FINGERPRINTING = 'fingerprinting'
}

// Scraper options
export interface ScraperOptions {
  engine?: ScraperEngine;
  siteType?: SiteType;
  selectors?: Record<string, string>;
  pagination?: {
    enabled: boolean;
    selector?: string;
    maxPages?: number;
  };
  javascriptRendering?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  proxy?: string;
  retryAttempts?: number;
  retryDelay?: number;
  botProtectionHandling?: boolean;
  detectedProtection?: BotProtectionType;
  userDataDir?: string;           // For persistent Puppeteer sessions
  isVisualSite?: boolean;         // For image-heavy sites needing visual scraping
  rateLimit?: {                   // For handling rate limits
    requestsPerMinute: number;
    pauseBetweenRequests: number;
  };
}

// Scraper result
export interface ScraperResult {
  url: string;
  title: string;
  html: string;
  text?: string;
  data: Record<string, any>;
  metadata: {
    links: string[];
    images: string[];
    statusCode: number;
    contentType: string;
    engineUsed: ScraperEngine;
    executionTime: number;
    botProtection?: {
      detected: boolean;
      type: BotProtectionType;
      bypassed: boolean;
      bypassMethod?: string;
    };
    errors?: {
      statusCode?: number;
      message: string;
      type: 'network' | 'parsing' | 'timeout' | 'rate_limited' | 'ip_blocked' | 'other';
      recoverable: boolean;
      retryAfter?: number; // In milliseconds
    }[];
    visualElements?: {
      count: number;
      capturedElements: Array<{
        selector: string;
        screenshotData?: string; // Base64 encoded screenshot
        isClickable: boolean;
        hasText: boolean;
      }>;
    };
    performanceMetrics?: {
      ttfb: number; // Time to first byte
      loadTime: number;
      renderTime: number;
      javaScriptTime: number;
    };
  };
}

/**
 * Web Scraper Service
 */
export class ScraperService {
  
  /**
   * Scrape a webpage
   */
  public static async scrape(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    const startTime = Date.now();
    
    // Set defaults
    const siteType = options.siteType || SiteType.GENERIC;
    const timeout = options.timeout || 30000;
    const headers = options.headers || {
      'User-Agent': 'Mozilla/5.0 (compatible; SynthralOS/1.0; +https://synthral.com/bot)'
    };
    
    // Select the appropriate engine based on site type and options
    const engineToUse = options.engine || this.selectEngineForSiteType(siteType, options);
    
    try {
      let result: ScraperResult;
      
      log(`Starting scraping with engine: ${engineToUse} for site type: ${siteType}`, 'scraper');
      
      switch (engineToUse) {
        case ScraperEngine.CHEERIO:
          result = await this.scrapeWithCheerio(url, options);
          break;
          
        case ScraperEngine.JSDOM:
          result = await this.scrapeWithJSDOM(url, options);
          break;
          
        case ScraperEngine.PUPPETEER:
          result = await this.scrapeWithPuppeteer(url, options);
          break;
          
        case ScraperEngine.CRAWL4AI:
          result = await this.scrapeWithCrawl4AI(url, options);
          break;
          
        default:
          log(`Unknown engine ${engineToUse}, falling back to Cheerio`, 'scraper');
          result = await this.scrapeWithCheerio(url, options);
          break;
      }
      
      // Add execution time
      result.metadata.executionTime = Date.now() - startTime;
      
      return result;
    } catch (error) {
      log(`Scraping error: ${error}`, 'scraper');
      throw new Error(`Scraping failed: ${error}`);
    }
  }
  
  /**
   * Scrape with Cheerio (static HTML parsing)
   */
  private static async scrapeWithCheerio(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    const headers = options.headers || {
      'User-Agent': 'Mozilla/5.0 (compatible; SynthralOS/1.0; +https://synthral.com/bot)'
    };
    
    // Fetch the page
    const response = await axios.get(url, {
      headers,
      timeout: options.timeout || 30000,
      ...(options.proxy ? { proxy: { host: options.proxy.split(':')[0], port: parseInt(options.proxy.split(':')[1]) } } : {})
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract basic data
    const title = $('title').text().trim();
    const text = $('body').text().trim();
    
    // Extract custom data based on selectors
    const data: Record<string, any> = {};
    if (options.selectors) {
      for (const [key, selector] of Object.entries(options.selectors)) {
        const elements = $(selector);
        if (elements.length === 1) {
          data[key] = elements.text().trim();
        } else if (elements.length > 1) {
          data[key] = elements.map((i, el) => $(el).text().trim()).get();
        }
      }
    }
    
    // Extract links and images
    const links = $('a').map((i, el) => $(el).attr('href')).get()
      .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:'));
    
    const images = $('img').map((i, el) => $(el).attr('src')).get()
      .filter(src => src);
    
    // Create result
    const result: ScraperResult = {
      url,
      title,
      html,
      text,
      data,
      metadata: {
        links,
        images,
        statusCode: response.status,
        contentType: response.headers['content-type'] || '',
        engineUsed: ScraperEngine.CHEERIO,
        executionTime: 0 // Will be updated later
      }
    };
    
    return result;
  }
  
  /**
   * Scrape with JSDOM - DOM-based parsing
   */
  private static async scrapeWithJSDOM(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    const headers = options.headers || {
      'User-Agent': 'Mozilla/5.0 (compatible; SynthralOS/1.0; +https://synthral.com/bot)'
    };
    
    // Fetch the page
    const response = await axios.get(url, {
      headers,
      timeout: options.timeout || 30000,
      ...(options.proxy ? { proxy: { host: options.proxy.split(':')[0], port: parseInt(options.proxy.split(':')[1]) } } : {})
    });
    
    const html = response.data;
    
    // Use JSDOM to create a virtual DOM
    const dom = new JSDOM(html, { url });
    const { document } = dom.window;
    
    // Extract basic data
    const title = document.title || '';
    const text = document.body?.textContent?.trim() || '';
    
    // Extract custom data based on selectors
    const data: Record<string, any> = {};
    if (options.selectors) {
      for (const [key, selector] of Object.entries(options.selectors)) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 1) {
            data[key] = elements[0].textContent?.trim() || '';
          } else if (elements.length > 1) {
            data[key] = Array.from(elements).map(el => el.textContent?.trim() || '');
          }
        } catch (error) {
          log(`Error with selector ${selector}: ${error}`, 'scraper');
        }
      }
    }
    
    // Extract links and images
    const links = Array.from(document.querySelectorAll('a'))
      .map(a => a.getAttribute('href'))
      .filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:')) as string[];
    
    const images = Array.from(document.querySelectorAll('img'))
      .map(img => img.getAttribute('src'))
      .filter(src => src) as string[];
    
    // Create result
    const result: ScraperResult = {
      url,
      title,
      html,
      text,
      data,
      metadata: {
        links,
        images,
        statusCode: response.status,
        contentType: response.headers['content-type'] || '',
        engineUsed: ScraperEngine.JSDOM,
        executionTime: 0 // Will be updated later
      }
    };
    
    return result;
  }
  
  /**
   * Scrape with Puppeteer - headless browser rendering
   */
  private static async scrapeWithPuppeteer(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    let browser;
    try {
      // Configure Puppeteer launch options
      const launchOptions: any = {
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu'
        ]
      };
      
      // Launch browser
      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (compatible; SynthralOS/1.0; +https://synthral.com/bot)');
      
      // Set custom headers if provided
      if (options.headers) {
        await page.setExtraHTTPHeaders(options.headers);
      }
      
      // Set cookies if provided
      if (options.cookies) {
        const cookies = Object.entries(options.cookies).map(([name, value]) => ({
          name,
          value,
          domain: new URL(url).hostname
        }));
        await page.setCookie(...cookies);
      }
      
      // Set timeout
      await page.setDefaultNavigationTimeout(options.timeout || 30000);
      
      // Navigate to the page
      const response = await page.goto(url, {
        waitUntil: 'networkidle2' // Wait until network is idle
      });
      
      if (!response) {
        throw new Error('Failed to get response from page');
      }
      
      // Wait a bit for dynamic content to load if needed
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get page content
      const html = await page.content();
      const title = await page.title();
      const text = await page.evaluate(() => document.body.innerText);
      
      // Extract custom data based on selectors
      const data: Record<string, any> = {};
      if (options.selectors) {
        for (const [key, selector] of Object.entries(options.selectors)) {
          try {
            const selectorExistsOnPage = await page.$(selector) !== null;
            if (selectorExistsOnPage) {
              const extractedTexts = await page.$$eval(selector, els => 
                els.map(el => el.textContent?.trim() || '')
              );
              
              if (extractedTexts.length === 1) {
                data[key] = extractedTexts[0];
              } else if (extractedTexts.length > 1) {
                data[key] = extractedTexts;
              }
            }
          } catch (error) {
            log(`Error with selector ${selector}: ${error}`, 'scraper');
          }
        }
      }
      
      // Extract links and images
      const links = await page.$$eval('a', as => as.map(a => a.href).filter(href => href && !href.startsWith('#') && !href.startsWith('javascript:')));
      const images = await page.$$eval('img', imgs => imgs.map(img => img.src).filter(src => src));
      
      // Handle pagination if enabled
      if (options.pagination?.enabled && options.pagination.selector) {
        const maxPages = options.pagination.maxPages || 1;
        const paginationSelector = options.pagination.selector;
        
        let currentPage = 1;
        while (currentPage < maxPages) {
          // Check if the next page button exists
          const nextPageExists = await page.$(paginationSelector) !== null;
          if (!nextPageExists) break;
          
          // Click next page and wait for navigation
          try {
            await Promise.all([
              page.waitForNavigation({ waitUntil: 'networkidle2' }),
              page.click(paginationSelector)
            ]);
            
            // Extract additional data from new page
            // This is simplified and would need to be adapted to specific pagination needs
            if (options.selectors) {
              for (const [key, selector] of Object.entries(options.selectors)) {
                try {
                  const additionalTexts = await page.$$eval(selector, els => 
                    els.map(el => el.textContent?.trim() || '')
                  );
                  
                  if (additionalTexts.length > 0) {
                    if (!data[key]) {
                      data[key] = additionalTexts;
                    } else if (Array.isArray(data[key])) {
                      data[key] = [...data[key], ...additionalTexts];
                    } else {
                      data[key] = [data[key], ...additionalTexts];
                    }
                  }
                } catch (error) {
                  // Continue on selector errors
                }
              }
            }
            
            currentPage++;
          } catch (error) {
            log(`Error during pagination: ${error}`, 'scraper');
            break;
          }
        }
      }
      
      // Create result
      const result: ScraperResult = {
        url,
        title,
        html,
        text,
        data,
        metadata: {
          links,
          images,
          statusCode: response.status(),
          contentType: response.headers()['content-type'] || '',
          engineUsed: ScraperEngine.PUPPETEER,
          executionTime: 0 // Will be updated later
        }
      };
      
      return result;
    } finally {
      // Always close the browser
      if (browser) {
        await browser.close();
      }
    }
  }
  
  /**
   * Scrape with Crawl4AI - advanced scraping with ML capabilities
   * This is a more advanced implementation that combines the strengths of various 
   * scraping approaches with additional intelligence
   */
  private static async scrapeWithCrawl4AI(
    url: string,
    options: ScraperOptions = {}
  ): Promise<ScraperResult> {
    // Start with Cheerio for basic extraction
    const cheerioResult = await this.scrapeWithCheerio(url, options);
    
    // For certain complex sites, combine with Puppeteer
    let html = cheerioResult.html;
    let dynamicData: Record<string, any> = {};
    
    // For specific site types that need rendered JS
    if (options.siteType === SiteType.E_COMMERCE || options.siteType === SiteType.JOB_BOARD) {
      try {
        // Use Puppeteer to extract dynamic data
        const puppeteerResult = await this.scrapeWithPuppeteer(url, options);
        html = puppeteerResult.html; // Use the rendered HTML
        
        // Extract structured data (JSON-LD, microdata, etc.)
        const structuredData = await this.extractStructuredData(puppeteerResult.html);
        if (structuredData) {
          dynamicData.structuredData = structuredData;
        }
        
        // Extract OpenGraph data
        const openGraphData = this.extractOpenGraphData(puppeteerResult.html);
        if (openGraphData && Object.keys(openGraphData).length > 0) {
          dynamicData.openGraph = openGraphData;
        }
      } catch (error) {
        log(`Error in advanced crawling: ${error}`, 'scraper');
        // Continue with the Cheerio result if Puppeteer fails
      }
    }
    
    // Merge data from different sources
    const mergedData = {
      ...cheerioResult.data,
      ...dynamicData
    };
    
    // Create enhanced result
    const result: ScraperResult = {
      url,
      title: cheerioResult.title,
      html,
      text: cheerioResult.text,
      data: mergedData,
      metadata: {
        links: cheerioResult.metadata.links,
        images: cheerioResult.metadata.images,
        statusCode: cheerioResult.metadata.statusCode,
        contentType: cheerioResult.metadata.contentType,
        engineUsed: ScraperEngine.CRAWL4AI,
        executionTime: 0 // Will be updated later
      }
    };
    
    return result;
  }
  
  /**
   * Extract structured data (JSON-LD, microdata) from HTML
   */
  private static async extractStructuredData(html: string): Promise<Record<string, any> | null> {
    try {
      const $ = cheerio.load(html);
      const structuredData: Record<string, any> = {};
      
      // Extract JSON-LD
      const jsonLdScripts = $('script[type="application/ld+json"]');
      if (jsonLdScripts.length > 0) {
        const jsonLdData: any[] = [];
        jsonLdScripts.each((_, element) => {
          try {
            const content = $(element).html();
            if (content) {
              const parsed = JSON.parse(content);
              jsonLdData.push(parsed);
            }
          } catch (e) {
            // Continue on parse errors
          }
        });
        
        if (jsonLdData.length > 0) {
          structuredData.jsonLd = jsonLdData;
        }
      }
      
      // Extract microdata (simplified)
      const itemScopes = $('[itemscope]');
      if (itemScopes.length > 0) {
        const microdata: Record<string, any>[] = [];
        
        itemScopes.each((_, element) => {
          const itemType = $(element).attr('itemtype');
          const properties: Record<string, string> = {};
          
          $(element).find('[itemprop]').each((_, propElement) => {
            const propName = $(propElement).attr('itemprop');
            if (propName) {
              properties[propName] = $(propElement).text().trim();
            }
          });
          
          if (Object.keys(properties).length > 0) {
            microdata.push({
              type: itemType,
              properties
            });
          }
        });
        
        if (microdata.length > 0) {
          structuredData.microdata = microdata;
        }
      }
      
      return Object.keys(structuredData).length > 0 ? structuredData : null;
    } catch (error) {
      log(`Error extracting structured data: ${error}`, 'scraper');
      return null;
    }
  }
  
  /**
   * Extract OpenGraph data from HTML
   */
  private static extractOpenGraphData(html: string): Record<string, string> {
    try {
      const $ = cheerio.load(html);
      const ogData: Record<string, string> = {};
      
      $('meta[property^="og:"]').each((_, element) => {
        const property = $(element).attr('property');
        const content = $(element).attr('content');
        
        if (property && content) {
          const key = property.replace('og:', '');
          ogData[key] = content;
        }
      });
      
      return ogData;
    } catch (error) {
      log(`Error extracting OpenGraph data: ${error}`, 'scraper');
      return {};
    }
  }
  
  /**
   * Select the appropriate scraper engine based on site type and options
   */
  public static selectEngineForSiteType(
    siteType: SiteType,
    options: ScraperOptions
  ): ScraperEngine {
    // Check for bot protection first - highest priority
    if (options.detectedProtection && options.detectedProtection !== BotProtectionType.NONE) {
      log(`Bot protection detected: ${options.detectedProtection}, using CloudScraper`, 'scraper');
      return ScraperEngine.CLOUDSCRAPER;
    }
    
    // Check for visual site - second priority
    if (options.isVisualSite || siteType === SiteType.VISUAL) {
      log(`Visual site detected, using ScrapeGraph for visual analysis`, 'scraper');
      return ScraperEngine.SCRAPEGRAPH;
    }
    
    // If JavaScript rendering is required, use Puppeteer - third priority
    if (options.javascriptRendering) {
      return ScraperEngine.PUPPETEER;
    }
    
    // Site-specific routing - fourth priority
    switch (siteType) {
      case SiteType.SPA:
      case SiteType.SOCIAL_MEDIA:
        // These typically require JavaScript rendering
        return ScraperEngine.PUPPETEER;
      
      case SiteType.E_COMMERCE:
      case SiteType.JOB_BOARD:
        // These benefit from Crawl4AI's structured data extraction
        return ScraperEngine.CRAWL4AI;
      
      case SiteType.NEWS:
        // News sites benefit from JSDOM's better parsing
        return ScraperEngine.JSDOM;
        
      case SiteType.FORUM:
        // Forums often have complex layouts but JSDOM is usually sufficient
        return ScraperEngine.JSDOM;
      
      case SiteType.PROTECTED:
        // Sites with known bot protection
        return ScraperEngine.CLOUDSCRAPER;
        
      case SiteType.GENERIC:
      default:
        // Static HTML parsing is often sufficient for these
        return ScraperEngine.CHEERIO;
    }
  }
  
  /**
   * Detect bot protection on a website
   * This should be run before scraping to determine the best engine
   */
  public static async detectBotProtection(url: string): Promise<BotProtectionType> {
    try {
      // First try a simple HEAD request
      const headResponse = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      // Look for Cloudflare headers
      const server = headResponse.headers['server'] || '';
      if (server.toLowerCase().includes('cloudflare')) {
        log(`Cloudflare detected on ${url}`, 'scraper');
        return BotProtectionType.CLOUDFLARE;
      }
      
      // Try a simple GET request
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.data;
      
      // Check for common CAPTCHA indicators
      if (
        html.includes('captcha') || 
        html.includes('CAPTCHA') || 
        html.includes('recaptcha') || 
        html.includes('hcaptcha')
      ) {
        log(`CAPTCHA detected on ${url}`, 'scraper');
        return BotProtectionType.CAPTCHA;
      }
      
      // Check for JavaScript challenges
      if (
        html.includes('challenge') || 
        html.includes('security check') ||
        html.includes('DDoS protection') ||
        html.includes('please wait') ||
        html.includes('checking your browser')
      ) {
        log(`JavaScript challenge detected on ${url}`, 'scraper');
        return BotProtectionType.JS_CHALLENGE;
      }
      
      // If we made it here, no obvious bot protection was detected
      return BotProtectionType.NONE;
      
    } catch (error) {
      // Look for specific error status codes that might indicate rate limiting
      if (error.response) {
        const status = error.response.status;
        
        if (status === 403 || status === 429) {
          log(`Rate limiting detected on ${url} (status: ${status})`, 'scraper');
          return BotProtectionType.RATE_LIMITING;
        }
        
        if (status === 503) {
          log(`Service unavailable, possibly Cloudflare on ${url}`, 'scraper');
          return BotProtectionType.CLOUDFLARE;
        }
      }
      
      // Fallback - no specific protection identified
      log(`Error checking bot protection: ${error}`, 'scraper');
      return BotProtectionType.NONE;
    }
  }
  
  /**
   * Detect if a site is highly visual and requires visual scraping
   */
  public static async detectVisualSite(url: string): Promise<boolean> {
    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      const html = response.data;
      const $ = cheerio.load(html);
      
      // Count images
      const imageCount = $('img').length;
      
      // Count text content length
      const textLength = $('body').text().trim().length;
      
      // Detect galleries or image-heavy content
      const hasGallery = html.toLowerCase().includes('gallery') || 
                         html.toLowerCase().includes('carousel') ||
                         $('[class*="gallery"]').length > 0 ||
                         $('[class*="carousel"]').length > 0;
      
      // Check if URL is from known visual sites
      const isKnownVisualSite = url.includes('instagram.com') || 
                               url.includes('pinterest.com') ||
                               url.includes('flickr.com') ||
                               url.includes('unsplash.com') ||
                               url.includes('shutterstock.com') ||
                               url.includes('behance.net');
      
      // Decide if visual scraping is needed
      const isVisualSite = isKnownVisualSite || 
                         hasGallery || 
                         (imageCount > 10 && imageCount * 100 > textLength);
      
      if (isVisualSite) {
        log(`Visual site detected: ${url}`, 'scraper');
      }
      
      return isVisualSite;
    } catch (error) {
      log(`Error detecting visual site: ${error}`, 'scraper');
      return false;
    }
  }
}