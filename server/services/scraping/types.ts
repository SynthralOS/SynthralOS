/**
 * Types for the scraping infrastructure
 */

// Scraper types
export enum ScraperType {
  BeautifulSoup = 'beautifulsoup',
  Scrapy = 'scrapy',
  Playwright = 'playwright',
  Puppeteer = 'puppeteer',
  Selenium = 'selenium',
  JobSpy = 'jobspy',
  Cloudscraper = 'cloudscraper'
}

// Base scraper configuration
export interface BaseScraperConfig {
  url: string;
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
  requestDelay?: number;
  proxy?: string;
  userAgent?: string;
}

// BeautifulSoup-specific configuration
export interface BeautifulSoupConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  waitForSelector?: string;
  allowNavigation?: boolean;
  parseJs?: boolean;
  encoding?: string;
}

// Scrapy-specific configuration
export interface ScrapyConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  allowedDomains?: string[];
  startUrls?: string[];
  depth?: number;
  follow?: boolean;
  rules?: {
    allow?: string[];
    deny?: string[];
    allowDomains?: string[];
    denyDomains?: string[];
  };
  itemFields?: string[];
}

// Playwright-specific configuration
export interface PlaywrightConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  waitForSelector?: string;
  waitTime?: number;
  scrollToBottom?: boolean;
  disableJavascript?: boolean;
  disableImages?: boolean;
  disableCSS?: boolean;
  stealth?: boolean;
}

// Puppeteer-specific configuration
export interface PuppeteerConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  waitForSelector?: string;
  waitTime?: number;
  scrollToBottom?: boolean;
  disableJavascript?: boolean;
  disableImages?: boolean;
  disableCSS?: boolean;
  headless?: boolean;
  stealth?: boolean;
}

// Selenium-specific configuration
export interface SeleniumConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  waitForSelector?: string;
  waitTime?: number;
  driver?: 'chrome' | 'firefox' | 'edge' | 'safari';
  executablePath?: string;
  headless?: boolean;
  arguments?: string[];
  scrollToBottom?: boolean;
  actions?: Array<{
    type: 'click' | 'input' | 'select' | 'wait' | 'scroll';
    selector?: string;
    value?: string;
    time?: number;
  }>;
}

// JobSpy-specific configuration
export interface JobSpyConfig extends BaseScraperConfig {
  keywords?: string[];
  locations?: string[];
  sources?: string[];
  results?: number;
  sortBy?: 'date' | 'relevance';
  pages?: number;
  filters?: {
    experienceLevel?: string[];
    employmentType?: string[];
    companySize?: string[];
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  };
}

// Cloudscraper-specific configuration
export interface CloudscraperConfig extends BaseScraperConfig {
  selectors: Record<string, string>;
  waitForSelector?: string;
  allowNavigation?: boolean;
  bypassAntibot?: boolean;
  clearanceTimeout?: number;
  challengeTimeout?: number;
}

// Union type for any scraper configuration
export type AnyScraperConfig = 
  | BeautifulSoupConfig
  | ScrapyConfig
  | PlaywrightConfig
  | PuppeteerConfig
  | SeleniumConfig
  | JobSpyConfig
  | CloudscraperConfig;