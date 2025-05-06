/**
 * Centralized logger utility for consistent logging across the application
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  timestamp?: boolean;
  module?: string;
  data?: any;
}

class Logger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(message: string, options: LogOptions = {}): string {
    const { timestamp = true, module } = options;
    let formattedMessage = '';
    
    if (timestamp) {
      formattedMessage += `[${this.getTimestamp()}] `;
    }
    
    if (module) {
      formattedMessage += `[${module}] `;
    }
    
    formattedMessage += message;
    
    return formattedMessage;
  }

  /**
   * Check if the specified level should be logged given the current log level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: { [key in LogLevel]: number } = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  /**
   * Set the logging level
   */
  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  /**
   * Log a debug message
   */
  debug(message: string, options: LogOptions = {}): void {
    if (!this.shouldLog('debug')) return;
    
    console.debug(this.formatMessage(message, options));
    
    if (options.data) {
      console.debug(options.data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, options: LogOptions = {}): void {
    if (!this.shouldLog('info')) return;
    
    console.info(this.formatMessage(message, options));
    
    if (options.data) {
      console.info(options.data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, options: LogOptions = {}): void {
    if (!this.shouldLog('warn')) return;
    
    console.warn(this.formatMessage(message, options));
    
    if (options.data) {
      console.warn(options.data);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: any, options: LogOptions = {}): void {
    if (!this.shouldLog('error')) return;
    
    console.error(this.formatMessage(message, options));
    
    if (error) {
      console.error(error);
    }
    
    if (options.data) {
      console.error(options.data);
    }
  }
}

// Export singleton instance
export const logger = new Logger();