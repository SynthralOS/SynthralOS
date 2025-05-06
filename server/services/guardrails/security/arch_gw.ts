/**
 * ArchGW Smart Prompt Router
 * 
 * This module provides intelligent routing of prompts based on content analysis
 * and supports blocking prohibited tasks and re-routing to appropriate handlers.
 */

import { SecurityConfig, GuardrailsAI } from './guardrails_ai';

// Custom Types

export interface RoutingConfig {
  enabled: boolean;
  defaultRoute: string;
  routeMap: Record<string, string>;
  blockList: string[];
  transformations: {
    enabled: boolean;
    removeEmailAddresses: boolean;
    removePII: boolean;
    enforceTaskFormat: boolean;
  };
}

export interface RouterResult {
  route: string;
  blocked: boolean;
  modified: boolean;
  errors?: string[];
  cleanedData?: unknown;
}

// In-memory keyword to route mapping
const ROUTE_KEYWORDS: Record<string, string[]> = {
  'langgraph': ['graph', 'workflow', 'sequence', 'pipeline', 'orchestration'],
  'agent_protocol': ['api', 'protocol', 'standard', 'interface', 'specification'],
  'openai': ['gpt', 'dalle', 'completion', 'chat', 'image', 'vision'],
  'anthropic': ['claude', 'human', 'assistant', 'anthropic'],
  'autogpt': ['autonomous', 'self-directed', 'continuous', 'goal'],
  'babyagi': ['task', 'memory', 'decomposition', 'iteration'],
  'crewai': ['team', 'collaborate', 'multi-agent', 'role', 'expert'],
  'react': ['reasoning', 'action', 'thought', 'observation'],
  'reflectionai': ['reflect', 'critique', 'improve', 'iterate', 'self-improve'],
  'rag': ['retrieval', 'document', 'knowledge', 'context', 'augmentation'],
  'planning': ['plan', 'strategy', 'step', 'sequence', 'schedule'],
  'llamaindex': ['index', 'document', 'llamaindex', 'llama_index', 'structured'],
  'social': ['twitter', 'facebook', 'linkedin', 'social', 'post'],
  'email': ['email', 'gmail', 'send', 'inbox', 'outbox'],
  'scrape': ['scrape', 'extract', 'crawl', 'web', 'data'],
  'ocr': ['image', 'text', 'extract', 'scan', 'recognize'],
  'kyro': ['extract', 'document', 'form', 'invoice', 'receipt'],
  'kushAI': ['business', 'intelligence', 'analyst', 'report', 'dashboard'],
  'rinaAI': ['analyze', 'summarize', 'process', 'action items', 'insights']
};

// Blocked patterns (sensitive information, dangerous actions, etc.)
const BLOCKED_PATTERNS = [
  /(hack|steal|bypass|compromise).+(credential|password|token|security)/i,
  /(generate|create).+(illegal|unlawful|dangerous|harmful)/i,
  /(bypass|circumvent|evade).+(moderation|filter|restriction)/i
];

/**
 * Remove personally identifiable information
 * 
 * @param text Input text
 * @returns Cleaned text
 */
function removePII(text: string): string {
  // Simple PII patterns (in practice this would be much more comprehensive)
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
    .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
}

/**
 * Determine the best route based on task content
 * 
 * @param task Task description text
 * @param routeMap Custom route mapping
 * @param defaultRoute Default route if no match found
 * @returns Best matching route
 */
function determineRoute(task: string, routeMap: Record<string, string>, defaultRoute: string): string {
  // Convert task to lowercase for case-insensitive matching
  const taskLower = task.toLowerCase();
  
  // Calculate keyword matches for each route
  const routeScores: Record<string, number> = {};
  
  // Check for direct matches from user's custom route map
  for (const [pattern, route] of Object.entries(routeMap)) {
    if (taskLower.includes(pattern.toLowerCase())) {
      return route;
    }
  }
  
  // Use built-in keyword routing as a fallback
  for (const [route, keywords] of Object.entries(ROUTE_KEYWORDS)) {
    routeScores[route] = 0;
    
    for (const keyword of keywords) {
      if (taskLower.includes(keyword.toLowerCase())) {
        routeScores[route] += 1;
      }
    }
  }
  
  // Find the route with the highest score
  let bestRoute = defaultRoute;
  let highestScore = 0;
  
  for (const [route, score] of Object.entries(routeScores)) {
    if (score > highestScore) {
      highestScore = score;
      bestRoute = route;
    }
  }
  
  return bestRoute;
}

/**
 * Check for blocked content
 * 
 * @param task Task description
 * @param blockList List of blocked terms or patterns
 * @returns Result with blocked status and explanation
 */
function checkBlockedContent(task: string, blockList: string[]): { blocked: boolean; reason?: string } {
  // Check custom block list
  for (const term of blockList) {
    if (task.toLowerCase().includes(term.toLowerCase())) {
      return {
        blocked: true,
        reason: `Task contains blocked term: "${term}"`
      };
    }
  }
  
  // Check built-in patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(task)) {
      return {
        blocked: true,
        reason: `Task matches blocked pattern: ${pattern.source}`
      };
    }
  }
  
  return { blocked: false };
}

/**
 * Smart Prompt Router
 * 
 * Routes prompts to appropriate handlers based on content analysis.
 * Provides security checking and content transformation.
 */
export class ArchGW {
  private config: RoutingConfig;
  
  constructor(config: RoutingConfig) {
    this.config = config;
  }
  
  /**
   * Process a prompt to determine routing and perform transformations
   * 
   * @param prompt User prompt text
   * @param metadata Additional context metadata
   * @returns Result with routing information
   */
  processPrompt(prompt: string, metadata?: Record<string, any>): RouterResult {
    if (!this.config.enabled) {
      return {
        route: this.config.defaultRoute,
        blocked: false,
        modified: false
      };
    }
    
    // Check for blocked content
    const blockCheck = checkBlockedContent(prompt, this.config.blockList);
    if (blockCheck.blocked) {
      return {
        route: this.config.defaultRoute,
        blocked: true,
        modified: false,
        errors: [blockCheck.reason || 'Task contains blocked content']
      };
    }
    
    // Determine route
    const route = determineRoute(prompt, this.config.routeMap, this.config.defaultRoute);
    
    // If no transformations are enabled, return as-is
    if (!this.config.transformations.enabled) {
      return {
        route,
        blocked: false,
        modified: false
      };
    }
    
    // Apply transformations
    let modifiedPrompt = prompt;
    let modified = false;
    
    if (this.config.transformations.removeEmailAddresses) {
      const oldPrompt = modifiedPrompt;
      modifiedPrompt = modifiedPrompt.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
      modified = modified || (oldPrompt !== modifiedPrompt);
    }
    
    if (this.config.transformations.removePII) {
      const oldPrompt = modifiedPrompt;
      modifiedPrompt = removePII(modifiedPrompt);
      modified = modified || (oldPrompt !== modifiedPrompt);
    }
    
    if (this.config.transformations.enforceTaskFormat) {
      // Only add "Task:" prefix if it doesn't already contain it
      if (!modifiedPrompt.toLowerCase().includes('task:')) {
        modifiedPrompt = `Task: ${modifiedPrompt}`;
        modified = true;
      }
    }
    
    return {
      route,
      blocked: false,
      modified,
      cleanedData: modified ? modifiedPrompt : undefined
    };
  }
  
  /**
   * Update the configuration
   * 
   * @param config New configuration
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      transformations: {
        ...this.config.transformations,
        ...config.transformations
      }
    };
  }
}