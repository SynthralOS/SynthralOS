/**
 * Configure Agent Framework
 * 
 * This module provides a factory function to configure and initialize
 * the AgentFramework with appropriate tools and settings.
 */

import { AgentFramework, AgentFrameworkConfig } from './AgentFramework';
import { AgentToolkit } from '../agent-toolkit';
import { log } from '../../vite';

/**
 * Configure and get the AgentFramework instance
 */
export async function configureAgentFramework(): Promise<AgentFramework> {
  try {
    // Create configuration
    const config: AgentFrameworkConfig = {
      defaultProtocol: 'agentgpt', // Default to simplest protocol
      defaultTools: [
        // Add common tools from the toolkit
        AgentToolkit.getWebSearchTool(),
        AgentToolkit.getWebScraperTool(),
        AgentToolkit.getCalculatorTool(),
        AgentToolkit.getDateTimeTool(),
        AgentToolkit.getWeatherTool(),
        AgentToolkit.getNewsSearchTool()
      ],
      apiKeys: {
        // Use environment variables for API keys
        anthropic: process.env.ANTHROPIC_API_KEY,
        openai: process.env.OPENAI_API_KEY
      }
    };
    
    // Get the framework instance
    const framework = AgentFramework.getInstance(config);
    
    // Initialize the framework
    await framework.initialize();
    
    log('Agent Framework configured successfully', 'agent');
    
    return framework;
  } catch (error) {
    log(`Error configuring Agent Framework: ${error}`, 'agent');
    throw error;
  }
}

/**
 * Map AgentType to protocol name
 */
export function mapAgentTypeToProtocol(agentType: string): string {
  switch (agentType.toLowerCase()) {
    // Original protocols
    case 'agentgpt':
    case 'assistant':
      return 'agentgpt';
      
    case 'autogpt':
    case 'autonomous':
    case 'planner':
      return 'autogpt';
      
    case 'metagpt':
    case 'team':
    case 'roleplay':
      return 'metagpt';
      
    case 'crewai':
    case 'crew':
    case 'multi-agent':
      return 'crewai';
      
    case 'openinterpreter':
    case 'interpreter':
    case 'code':
      return 'openinterpreter';
      
    case 'archon':
    case 'self-healing':
    case 'error-correcting':
      return 'archon';
    
    // New protocols (first 10 additions)
    case 'babyagi':
    case 'task-prioritization':
      return 'babyagi';
      
    case 'kushai':
    case 'blog':
    case 'content-creation':
      return 'kushai';
      
    case 'instagramagent':
    case 'instagram':
    case 'social-media':
      return 'instagramagent';
      
    case 'rionaai':
    case 'monitoring':
    case 'twitter-monitor':
    case 'github-monitor':
      return 'rionaai';
      
    case 'kyro':
    case 'serverless':
    case 'efficiency':
      return 'kyro';
      
    case 'camelai':
    case 'conversation':
    case 'roleplay-agent':
      return 'camelai';
      
    case 'autogen':
    case 'microsoft-autogen':
    case 'collaborative':
      return 'autogen';
      
    case 'smolagents':
    case 'smol':
    case 'lightweight':
    case 'efficient-agent':
      return 'smolagents';
      
    case 'allhands':
    case 'development-team':
    case 'dev-agents':
      return 'allhands';
      
    case 'qodopr':
    case 'pr-agent':
    case 'github-pr':
    case 'pull-request':
      return 'qodopr';
      
    // New protocols (latest 3 additions)
    case 'msagentautobuilder':
    case 'autobuilder':
    case 'microsoft-agent':
      return 'msagentautobuilder';
      
    case 'kortixbuilder':
    case 'kortix':
    case 'sunaso':
    case 'workflow-builder':
      return 'kortixbuilder';
      
    case 'agentkitgoogle':
    case 'agentkit':
    case 'google-agent':
    case 'component-agent':
      return 'agentkitgoogle';
      
    case 'mcpserver':
    case 'mcp':
    case 'message-control':
    case 'agent-messaging':
    case 'multi-agent-messaging':
      return 'mcpserver';
      
    default:
      return 'agentgpt'; // Default to simplest protocol
  }
}

/**
 * Check if API keys are properly configured
 */
export function checkApiKeys(): { 
  anthropic: boolean; 
  openai: boolean; 
  missing: string[];
} {
  const anthropic = !!process.env.ANTHROPIC_API_KEY;
  const openai = !!process.env.OPENAI_API_KEY;
  
  const missing = [];
  if (!anthropic) missing.push('ANTHROPIC_API_KEY');
  if (!openai) missing.push('OPENAI_API_KEY');
  
  return { anthropic, openai, missing };
}