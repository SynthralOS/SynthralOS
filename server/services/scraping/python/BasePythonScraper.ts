import { BaseScraper } from '../BaseScraper';
import { BaseScraperConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { v4 as uuid } from 'uuid';
import * as os from 'os';

/**
 * Abstract base class for Python-based scrapers
 */
export abstract class BasePythonScraper extends BaseScraper {
  protected tempDir: string;
  protected pythonScriptPath: string;
  protected outputPath: string;
  
  /**
   * Constructor for BasePythonScraper
   * 
   * @param config The base configuration for the scraper
   */
  constructor(config: BaseScraperConfig) {
    super(config);
    
    // Create a unique temp directory for this scraper instance
    this.tempDir = path.join(os.tmpdir(), `scraper-${uuid()}`);
    fs.mkdirSync(this.tempDir, { recursive: true });
    
    // Set paths for Python script and output file
    this.pythonScriptPath = path.join(this.tempDir, 'scraper.py');
    this.outputPath = path.join(this.tempDir, 'output.json');
  }
  
  /**
   * Abstract method to generate the Python script
   * Must be implemented by concrete Python scraper classes
   */
  protected abstract generatePythonScript(): string;
  
  /**
   * Run the scraper by generating and executing a Python script
   */
  public async scrape(): Promise<any> {
    try {
      if (!this.validateConfig()) {
        throw new Error('Invalid scraper configuration');
      }
      
      this.startTimer();
      
      // Generate and write the Python script
      const pythonScript = this.generatePythonScript();
      fs.writeFileSync(this.pythonScriptPath, pythonScript);
      
      // Execute the Python script
      await this.executePythonScript();
      
      // Read the output
      const output = this.readOutput();
      
      this.endTimer();
      
      // Clean up temp files
      this.cleanup();
      
      return output;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }
  
  /**
   * Execute the Python script
   */
  protected async executePythonScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      exec(`python ${this.pythonScriptPath}`, {
        timeout: this.config.timeout || 60000 // Default timeout: 60 seconds
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Python script execution error:', error);
          console.error('Standard error output:', stderr);
          return reject(new Error(`Python execution error: ${error.message}`));
        }
        
        if (stderr) {
          console.warn('Python script stderr:', stderr);
        }
        
        console.log('Python script stdout:', stdout);
        resolve();
      });
    });
  }
  
  /**
   * Read the output file
   */
  protected readOutput(): any {
    try {
      if (!fs.existsSync(this.outputPath)) {
        throw new Error('Output file not found');
      }
      
      const outputContent = fs.readFileSync(this.outputPath, 'utf-8');
      return JSON.parse(outputContent);
    } catch (error) {
      throw new Error(`Error reading output: ${error.message}`);
    }
  }
  
  /**
   * Clean up temporary files
   */
  protected cleanup(): void {
    try {
      if (fs.existsSync(this.pythonScriptPath)) {
        fs.unlinkSync(this.pythonScriptPath);
      }
      
      if (fs.existsSync(this.outputPath)) {
        fs.unlinkSync(this.outputPath);
      }
      
      // Attempt to remove the temp directory
      try {
        fs.rmdirSync(this.tempDir);
      } catch (error) {
        console.warn('Failed to remove temp directory:', error);
      }
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }
}