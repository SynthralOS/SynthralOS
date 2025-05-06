import { BasePythonScraper } from './BasePythonScraper';
import { ScraperType, JobSpyConfig, ScrapingResult, AnyScraperConfig } from '../types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * JobSpy Scraper
 * Specialized scraper for job boards using the JobSpy Python library
 */
export class JobSpyScraper extends BasePythonScraper {
  /**
   * Get the type of scraper
   */
  getType(): ScraperType {
    return ScraperType.JOBSPY;
  }
  
  /**
   * Get the Python script name for this scraper
   */
  protected getScriptName(): string {
    return 'jobspy_scraper.py';
  }
  
  /**
   * Validate the scraper configuration
   */
  protected async doValidateConfig(config: AnyScraperConfig): Promise<string[]> {
    const errors: string[] = [];
    const jobSpyConfig = config as JobSpyConfig;
    
    if (!jobSpyConfig.site) {
      errors.push('Job site is required for JobSpy scraper');
    } else if (!['linkedin', 'indeed', 'glassdoor', 'monster', 'simplyhired', 'ziprecruiter'].includes(jobSpyConfig.site)) {
      errors.push('Job site must be one of: linkedin, indeed, glassdoor, monster, simplyhired, ziprecruiter');
    }
    
    if (!jobSpyConfig.keywords || jobSpyConfig.keywords.length === 0) {
      errors.push('At least one keyword is required for JobSpy scraper');
    }
    
    return errors;
  }
  
  /**
   * Generate the JobSpy scraper script
   */
  protected async generateScript(): Promise<string> {
    return `#!/usr/bin/env python3
import sys
import os
import json
import argparse
import logging
from jobspy import scrape_jobs

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger('jobspy_scraper')

def main():
    parser = argparse.ArgumentParser(description='JobSpy Scraper')
    parser.add_argument('--input', type=str, help='Path to JSON config file')
    args = parser.parse_args()
    
    try:
        # Load configuration
        config = {}
        if args.input and os.path.exists(args.input):
            with open(args.input, 'r', encoding='utf-8') as f:
                config = json.load(f)
        
        # Extract parameters
        site = config.get('site', 'linkedin')
        keywords = config.get('keywords', [])
        location = config.get('location')
        distance = config.get('distance')
        results_wanted = config.get('results_wanted', 100)
        hours_old = config.get('hours_old', 24)
        experience_level = config.get('experience_level')
        job_type = config.get('job_type')
        
        # Convert keywords to comma-separated string if it's a list
        if isinstance(keywords, list):
            keywords = ', '.join(keywords)
        
        # Set up parameters for JobSpy
        scrape_params = {
            'site_name': site,
            'search_term': keywords,
            'results_wanted': results_wanted,
            'hours_old': hours_old,
        }
        
        # Add optional parameters if provided
        if location:
            scrape_params['location'] = location
        if distance:
            scrape_params['distance'] = distance
        if experience_level:
            scrape_params['experience_level'] = experience_level
        if job_type:
            scrape_params['job_type'] = job_type
        
        # Scrape jobs
        logger.info(f"Starting JobSpy scraper for {site} with keywords: {keywords}")
        jobs = scrape_jobs(**scrape_params)
        
        # Convert data to serializable format
        results = []
        for job in jobs:
            job_data = {
                'title': job.get('title', ''),
                'company': job.get('company', ''),
                'location': job.get('location', ''),
                'date_posted': job.get('date_posted', ''),
                'job_url': job.get('job_url', ''),
                'salary': job.get('salary', ''),
                'description': job.get('description', ''),
                'job_type': job.get('job_type', ''),
                'site': site
            }
            results.append(job_data)
        
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
      const jobSpyConfig = this.config as JobSpyConfig;
      
      // Convert config to Python-compatible format
      const pythonConfig = {
        site: jobSpyConfig.site,
        keywords: jobSpyConfig.keywords,
        location: jobSpyConfig.location,
        distance: jobSpyConfig.distance,
        results_wanted: jobSpyConfig.results_wanted,
        hours_old: jobSpyConfig.hours_old,
        experience_level: jobSpyConfig.experience_level,
        job_type: jobSpyConfig.job_type
      };
      
      // Run the Python script
      const result = await this.runPythonScriptWithJson(pythonConfig);
      
      if (result.status === 'error') {
        return this.createErrorResult(result.error || 'Unknown error in JobSpy script');
      }
      
      // Process and return data
      const url = `${jobSpyConfig.site} job search for ${jobSpyConfig.keywords.join(', ')}`;
      return this.createSuccessResult(result.data, url);
    } catch (error: any) {
      return this.createErrorResult(error.message || 'Failed to execute JobSpy scraper');
    }
  }
}