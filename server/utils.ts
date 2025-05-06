/**
 * Utility functions for the server
 */

/**
 * Get the base URL for the server
 */
export function getBaseUrl(): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = process.env.REPLIT_DOMAINS
    ? process.env.REPLIT_DOMAINS.split(',')[0]
    : 'localhost:5000';
  
  return `${protocol}://${host}`;
}

/**
 * Generate a random ID
 */
export function generateId(length: number = 10): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Format a date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Safely parse JSON
 */
export function safeJsonParse(text: string, fallback: any = null): any {
  try {
    return JSON.parse(text);
  } catch (error) {
    return fallback;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a debounced function
 */
export function debounce<F extends (...args: any[]) => any>(
  func: F,
  waitMs: number
): (...args: Parameters<F>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(...args: Parameters<F>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

/**
 * Create a throttled function
 */
export function throttle<F extends (...args: any[]) => any>(
  func: F,
  limitMs: number
): (...args: Parameters<F>) => void {
  let lastFunc: NodeJS.Timeout;
  let lastRan: number;
  
  return function(...args: Parameters<F>): void {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limitMs) {
          func(...args);
          lastRan = Date.now();
        }
      }, limitMs - (Date.now() - lastRan));
    }
  };
}

/**
 * Create an async sleep function
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a memoized function
 */
export function memoize<F extends (...args: any[]) => any>(
  func: F,
  resolver?: (...args: Parameters<F>) => string
): (...args: Parameters<F>) => ReturnType<F> {
  const cache = new Map<string, ReturnType<F>>();
  
  return function(...args: Parameters<F>): ReturnType<F> {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  };
}

/**
 * Create a retry function
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    onRetry?: (error: any, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    onRetry = () => {},
  } = options;
  
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      onRetry(error, attempt);
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}