import { AgentTool } from './agent';
import { OCRService, DocumentType } from './ocr';
import { ScraperService, SiteType } from './scraper';
import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Agent toolkit for providing common tools to agents
 */
export class AgentToolkit {
  
  /**
   * Get all available tools
   */
  public static getAllTools(): AgentTool[] {
    return [
      this.getWebSearchTool(),
      this.getWebScraperTool(),
      this.getImageOCRTool(),
      this.getCalculatorTool(),
      this.getDateTimeTool(),
      this.getWeatherTool(),
      this.getNewsSearchTool()
    ];
  }
  
  /**
   * Get specific tools by name
   */
  public static getTools(toolNames: string[]): AgentTool[] {
    const allTools = this.getAllTools();
    return allTools.filter(tool => toolNames.includes(tool.name));
  }
  
  /**
   * Web search tool
   */
  public static getWebSearchTool(): AgentTool {
    return {
      name: 'web_search',
      description: 'Search the web for information on a given query',
      parameters: {
        query: {
          type: 'string',
          description: 'The search query',
          required: true
        },
        num_results: {
          type: 'number',
          description: 'Number of results to return (default: 5)',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        const query = params.query;
        const numResults = params.num_results || 5;
        
        try {
          // This is a simplified mock implementation
          // In a real implementation, you would use a search API or web scraping
          
          // For now, we'll simulate web search results
          const dummyResults = [
            {
              title: `Result for ${query} - 1`,
              url: `https://example.com/result1?q=${encodeURIComponent(query)}`,
              snippet: `This is a sample result for the query "${query}". It provides some information about the topic.`
            },
            {
              title: `Result for ${query} - 2`,
              url: `https://example.com/result2?q=${encodeURIComponent(query)}`,
              snippet: `Another result for "${query}". This one has different information about the same topic.`
            },
            {
              title: `About ${query} - Wikipedia`,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query.replace(/\s+/g, '_'))}`,
              snippet: `${query} refers to a concept or entity that has various aspects and characteristics.`
            }
          ];
          
          // Generate more results if needed
          while (dummyResults.length < numResults) {
            const index = dummyResults.length + 1;
            dummyResults.push({
              title: `Result for ${query} - ${index}`,
              url: `https://example.com/result${index}?q=${encodeURIComponent(query)}`,
              snippet: `Additional information about "${query}" covering different aspects of the topic.`
            });
          }
          
          return dummyResults.slice(0, numResults);
        } catch (error) {
          throw new Error(`Web search failed: ${error}`);
        }
      }
    };
  }
  
  /**
   * Web scraper tool
   */
  public static getWebScraperTool(): AgentTool {
    return {
      name: 'web_scraper',
      description: 'Scrape content from a webpage',
      parameters: {
        url: {
          type: 'string',
          description: 'The URL to scrape',
          required: true
        },
        selectors: {
          type: 'object',
          description: 'CSS selectors to extract specific elements',
          required: false
        },
        site_type: {
          type: 'string',
          description: 'Type of site (generic, e_commerce, news, etc.)',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const url = params.url;
          const selectors = params.selectors || {};
          const siteType = params.site_type || SiteType.GENERIC;
          
          const result = await ScraperService.scrape(url, {
            selectors,
            siteType: siteType as SiteType
          });
          
          // Clean up the result before returning to agent
          // Create a sanitized version with limited HTML
          const resultWithText = {
            ...result,
            text: result.text || '',
            html: result.text ? result.text.substring(0, 1000) + '... (truncated)' : 'No text content extracted'
          };
          
          return resultWithText;
        } catch (error) {
          throw new Error(`Web scraping failed: ${error}`);
        }
      }
    };
  }
  
  /**
   * Image OCR tool
   */
  public static getImageOCRTool(): AgentTool {
    return {
      name: 'image_ocr',
      description: 'Extract text from images using OCR',
      parameters: {
        image_url: {
          type: 'string',
          description: 'URL of the image to process',
          required: true
        },
        document_type: {
          type: 'string',
          description: 'Type of document (generic, invoice, receipt, etc.)',
          required: false
        },
        language: {
          type: 'string',
          description: 'Language code (e.g., eng, fra, deu)',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const imageUrl = params.image_url;
          const documentType = params.document_type || DocumentType.GENERIC;
          const language = params.language || 'eng';
          
          // Fetch image data
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          const imageBuffer = Buffer.from(response.data);
          
          // Process with OCR
          const result = await OCRService.processImage(imageBuffer, {
            documentType: documentType as DocumentType,
            language
          });
          
          return result;
        } catch (error) {
          throw new Error(`OCR processing failed: ${error}`);
        }
      }
    };
  }
  
  /**
   * Calculator tool
   */
  public static getCalculatorTool(): AgentTool {
    return {
      name: 'calculator',
      description: 'Perform mathematical calculations',
      parameters: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate',
          required: true
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const expression = params.expression;
          
          // IMPORTANT: In a production environment, use a safer method for evaluation
          // This is a simplified implementation and has security risks
          // eslint-disable-next-line no-eval
          const result = eval(expression);
          
          return {
            expression,
            result: result
          };
        } catch (error) {
          throw new Error(`Calculator error: ${error}`);
        }
      }
    };
  }
  
  /**
   * Date and time tool
   */
  public static getDateTimeTool(): AgentTool {
    return {
      name: 'date_time',
      description: 'Get current date and time information',
      parameters: {
        timezone: {
          type: 'string',
          description: 'Timezone (default: UTC)',
          required: false
        },
        format: {
          type: 'string',
          description: 'Date format',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const now = new Date();
          
          return {
            iso: now.toISOString(),
            unix_timestamp: Math.floor(now.getTime() / 1000),
            utc: now.toUTCString(),
            local: now.toString()
          };
        } catch (error) {
          throw new Error(`Date time error: ${error}`);
        }
      }
    };
  }
  
  /**
   * Weather tool
   */
  public static getWeatherTool(): AgentTool {
    return {
      name: 'weather',
      description: 'Get weather information for a location',
      parameters: {
        location: {
          type: 'string',
          description: 'Location (city name or coordinates)',
          required: true
        },
        units: {
          type: 'string',
          description: 'Units (metric or imperial)',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const location = params.location;
          const units = params.units || 'metric';
          
          // This is a mock implementation
          // In a real implementation, you would use a weather API
          
          const weatherConditions = [
            'Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm', 
            'Snowy', 'Foggy', 'Windy', 'Clear'
          ];
          
          const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
          const temperature = units === 'metric' 
            ? Math.floor(Math.random() * 35) // Celsius
            : Math.floor(Math.random() * 60 + 30); // Fahrenheit
          
          return {
            location,
            temperature: {
              value: temperature,
              unit: units === 'metric' ? 'C' : 'F'
            },
            condition: randomCondition,
            humidity: Math.floor(Math.random() * 100),
            wind_speed: Math.floor(Math.random() * 30),
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          throw new Error(`Weather information error: ${error}`);
        }
      }
    };
  }
  
  /**
   * News search tool
   */
  public static getNewsSearchTool(): AgentTool {
    return {
      name: 'news_search',
      description: 'Search for news articles on a topic',
      parameters: {
        query: {
          type: 'string',
          description: 'The search query',
          required: true
        },
        num_results: {
          type: 'number',
          description: 'Number of results to return (default: 5)',
          required: false
        },
        days_back: {
          type: 'number',
          description: 'How many days back to search (default: 7)',
          required: false
        }
      },
      execute: async (params: Record<string, any>) => {
        try {
          const query = params.query;
          const numResults = params.num_results || 5;
          const daysBack = params.days_back || 7;
          
          // This is a simplified mock implementation
          // In a real implementation, you would use a news API or web scraping
          
          const currentDate = new Date();
          const results = [];
          
          for (let i = 0; i < numResults; i++) {
            const daysAgo = Math.floor(Math.random() * daysBack);
            const date = new Date(currentDate);
            date.setDate(date.getDate() - daysAgo);
            
            results.push({
              title: `News about ${query} - ${i + 1}`,
              url: `https://news-example.com/article${i + 1}?topic=${encodeURIComponent(query)}`,
              source: `News Source ${i + 1}`,
              published_date: date.toISOString(),
              snippet: `This is a news article about "${query}" published ${daysAgo} days ago.`
            });
          }
          
          return results;
        } catch (error) {
          throw new Error(`News search failed: ${error}`);
        }
      }
    };
  }
}