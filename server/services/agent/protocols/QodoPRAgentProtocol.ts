/**
 * Qodo PR-Agent Protocol Implementation
 * 
 * Implements the Qodo PR-Agent protocol for GitHub Pull Request auto-summarization and review.
 * Specializes in analyzing code changes and providing quality feedback.
 */

import { 
  BaseProtocol, 
  ProtocolCapabilities, 
  ProtocolConfig, 
  ProtocolMetadata, 
  ProtocolExecutionOptions,
  ExecutionMode
} from './BaseProtocol';
import { AgentTool, AgentResponse, AgentMemory } from '../agent';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../../vite';
import OpenAI from 'openai';

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// PR analysis components
interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'deleted';
  patch: string;
  content?: string;
}

interface PRMetadata {
  title: string;
  description: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
  repositoryUrl?: string;
}

interface PRReview {
  summary: string;
  description: string;
  codeQuality: number;
  bugRisk: number;
  suggestions: Array<{
    file: string;
    lineNumber?: number;
    suggestion: string;
    impact: 'high' | 'medium' | 'low';
    type: 'improvement' | 'bug' | 'security' | 'performance' | 'style' | 'documentation';
  }>;
  overallFeedback: string;
}

export class QodoPRAgentProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: `You are Qodo PR-Agent, an intelligent code reviewer for GitHub Pull Requests.
Your goal is to thoroughly analyze code changes and provide valuable feedback.
You excel at understanding context, identifying potential issues, and suggesting quality improvements.`,
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.3,
    maxTokens: 2048,
    capabilities: [
      ProtocolCapabilities.TOOL_USE,
      ProtocolCapabilities.CODE_EXECUTION,
      ProtocolCapabilities.MULTI_STEP
    ]
  };

  private anthropicClient: Anthropic | null = null;
  private openaiClient: OpenAI | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  
  // PR state
  private prFiles: PRFile[] = [];
  private prMetadata: PRMetadata | null = null;
  private prReview: PRReview | null = null;
  private codebaseContext: string = '';

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'Qodo PR-Agent',
      version: '1.0.0',
      description: 'GitHub Pull Request auto-summarizer and reviewer',
      capabilities: [
        ProtocolCapabilities.TOOL_USE,
        ProtocolCapabilities.CODE_EXECUTION,
        ProtocolCapabilities.MULTI_STEP
      ],
      requiresAuthentication: true,
      supportedModels: [
        'claude-3-7-sonnet-20250219',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-4'
      ]
    };
  }

  /**
   * Initialize the protocol with configuration
   */
  public async init(config: ProtocolConfig): Promise<void> {
    this.config = {
      ...this.config,
      ...config
    };

    // Initialize Anthropic client if using Claude
    if (this.config.modelName?.includes('claude')) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required for Claude models');
      }
      
      this.anthropicClient = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    } else if (this.config.modelName?.includes('gpt')) {
      // Initialize OpenAI client if using GPT
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required for OpenAI models');
      }
      
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    
    // Store available tools
    this.availableTools = this.config.tools || [];
    
    // Reset PR state
    this.prFiles = [];
    this.prMetadata = null;
    this.prReview = null;
    this.codebaseContext = '';
    
    this.initialized = true;
  }

  /**
   * Execute a task using this protocol
   */
  public async execute(options: ProtocolExecutionOptions): Promise<AgentResponse> {
    if (!this.initialized) {
      throw new Error('Protocol not initialized. Call init() first.');
    }

    const startTime = Date.now();
    
    try {
      // Call onStart callback if provided
      if (options.callbacks?.onStart) {
        options.callbacks.onStart();
      }

      // Parse the PR information from the task
      await this.parsePRInfo(options.task, options);

      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'PR Analysis',
          description: 'Analyzing PR files and changes',
          status: 'started'
        });
      }

      // Step 1: Deep analysis of each file in the PR
      await this.analyzePRFiles(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'PR Analysis',
          description: 'PR files analyzed',
          output: { filesAnalyzed: this.prFiles.length },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'PR Summary Generation',
          description: 'Generating concise PR summary',
          status: 'started'
        });
      }

      // Step 2: Generate PR summary
      await this.generatePRSummary(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'PR Summary Generation',
          description: 'PR summary generated',
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Code Review',
          description: 'Reviewing code quality and suggesting improvements',
          status: 'started'
        });
      }

      // Step 3: Conduct code review and generate suggestions
      await this.conductCodeReview(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Code Review',
          description: 'Code review completed',
          output: { 
            suggestions: this.prReview?.suggestions.length || 0,
            codeQuality: this.prReview?.codeQuality || 0
          },
          status: 'completed'
        });
      }
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Final Report',
          description: 'Generating final PR review report',
          status: 'started'
        });
      }

      // Step 4: Generate final PR review report
      const finalReport = await this.generateFinalReport(options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Final Report',
          description: 'Final PR review report generated',
          status: 'completed'
        });
      }
      
      const agentResponse: AgentResponse = {
        response: {
          content: finalReport,
          toolCalls: this.getToolCallsHistory()
        },
        executionTime: Date.now() - startTime,
        protocol: 'qodopr',
        metadata: {
          filesReviewed: this.prFiles.length,
          suggestions: this.prReview?.suggestions.length || 0,
          codeQuality: this.prReview?.codeQuality || 0
        }
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`Qodo PR-Agent Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Parse PR information from the task
   */
  private async parsePRInfo(task: string, options: ProtocolExecutionOptions): Promise<void> {
    // Try to extract PR metadata from the task description
    const titleMatch = task.match(/Title:?\s*([^\n]+)/i);
    const descriptionMatch = task.match(/Description:?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
    const authorMatch = task.match(/Author:?\s*([^\n]+)/i);
    const branchMatch = task.match(/Branch:?\s*([^\n]+)/i) || task.match(/Head Branch:?\s*([^\n]+)/i);
    const baseBranchMatch = task.match(/Base Branch:?\s*([^\n]+)/i);
    const filesChangedMatch = task.match(/Files Changed:?\s*(\d+)/i);
    const additionsMatch = task.match(/Additions:?\s*(\d+)/i);
    const deletionsMatch = task.match(/Deletions:?\s*(\d+)/i);
    const repoMatch = task.match(/Repository:?\s*([^\n]+)/i) || task.match(/Repo:?\s*([^\n]+)/i);
    
    // Extract file patches (if included in the task)
    const filePatches: PRFile[] = [];
    const fileRegex = /File: ([^\n]+)\nStatus: (added|modified|deleted)\nPatch:\n```(?:diff)?\n([\s\S]+?)```/gi;
    let fileMatch;
    
    while ((fileMatch = fileRegex.exec(task)) !== null) {
      filePatches.push({
        filename: fileMatch[1].trim(),
        status: fileMatch[2] as 'added' | 'modified' | 'deleted',
        patch: fileMatch[3]
      });
    }
    
    // Store the PR metadata
    this.prMetadata = {
      title: titleMatch ? titleMatch[1].trim() : 'Untitled PR',
      description: descriptionMatch ? descriptionMatch[1].trim() : 'No description provided',
      author: authorMatch ? authorMatch[1].trim() : 'Unknown',
      baseBranch: baseBranchMatch ? baseBranchMatch[1].trim() : 'main',
      headBranch: branchMatch ? branchMatch[1].trim() : 'feature-branch',
      filesChanged: filesChangedMatch ? parseInt(filesChangedMatch[1]) : filePatches.length,
      additions: additionsMatch ? parseInt(additionsMatch[1]) : 0,
      deletions: deletionsMatch ? parseInt(deletionsMatch[1]) : 0,
      repositoryUrl: repoMatch ? repoMatch[1].trim() : undefined
    };
    
    // Store the file patches
    this.prFiles = filePatches;
    
    // If no file patches were found in the task, try to fetch them using GitHub API tool
    if (this.prFiles.length === 0) {
      const githubTool = this.availableTools.find(tool => 
        tool.name.includes('github') || tool.name.includes('git') || tool.name.includes('repo')
      );
      
      if (githubTool) {
        await this.fetchPRFilesWithTool(githubTool, task, options);
      } else {
        // If no GitHub tool is available, create synthetic file entries based on PR description
        this.createSyntheticFileEntries();
      }
    }
    
    // Try to get codebase context if available
    await this.fetchCodebaseContext(options);
  }

  /**
   * Fetch PR files using GitHub API tool
   */
  private async fetchPRFilesWithTool(
    githubTool: AgentTool, 
    task: string, 
    options: ProtocolExecutionOptions
  ): Promise<void> {
    try {
      // Extract PR number and repository from task
      const prNumberMatch = task.match(/PR #?(\d+)/i) || task.match(/Pull Request #?(\d+)/i);
      const repoMatch = task.match(/repository:?\s*([^\n]+)/i) || task.match(/repo:?\s*([^\n]+)/i);
      
      if (!prNumberMatch || !repoMatch) {
        throw new Error('Could not extract PR number and repository from task');
      }
      
      const prNumber = prNumberMatch[1];
      const repository = repoMatch[1].trim();
      
      // Prepare tool parameters
      const toolParams = {
        repo: repository,
        prNumber: parseInt(prNumber),
        includeContent: true
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: toolParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the GitHub tool
      const prData = await githubTool.execute(toolParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: githubTool.name,
          input: toolParams,
          output: prData,
          error: undefined
        });
      }
      
      // Update PR metadata and files from the tool response
      if (prData) {
        if (prData.title) {
          this.prMetadata!.title = prData.title;
        }
        if (prData.description) {
          this.prMetadata!.description = prData.description;
        }
        if (prData.author) {
          this.prMetadata!.author = prData.author;
        }
        
        // Extract files
        if (prData.files && Array.isArray(prData.files)) {
          this.prFiles = prData.files.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            patch: file.patch || '',
            content: file.content
          }));
        }
      }
      
    } catch (error) {
      log(`Error fetching PR files with GitHub tool: ${error}`, 'agent');
      // Continue with whatever PR info we have
    }
  }

  /**
   * Create synthetic file entries based on PR description if no files are found
   */
  private createSyntheticFileEntries(): void {
    if (!this.prMetadata) return;
    
    // Extract potential file mentions from PR description
    const fileRegex = /(?:(?:added|modified|deleted|changed)\s+)?([a-zA-Z0-9_/.-]+\.[a-zA-Z0-9]+)/gi;
    const matches = [...this.prMetadata.description.matchAll(fileRegex)];
    
    const fileNames = [...new Set(matches.map(match => match[1]))];
    
    if (fileNames.length > 0) {
      // Create file entries for the mentioned files
      this.prFiles = fileNames.map(filename => ({
        filename,
        status: 'modified',
        patch: 'File content not available'
      }));
    } else {
      // Create generic file entries
      this.prFiles = [
        {
          filename: 'src/main.js',
          status: 'modified',
          patch: 'File content not available'
        }
      ];
    }
  }

  /**
   * Fetch codebase context if available
   */
  private async fetchCodebaseContext(options: ProtocolExecutionOptions): Promise<void> {
    const codebaseTool = this.availableTools.find(tool => 
      tool.name.includes('codebase') || tool.name.includes('repo_context') || tool.name.includes('code_context')
    );
    
    if (!codebaseTool || !this.prMetadata?.repositoryUrl) {
      return;
    }
    
    try {
      // Prepare tool parameters
      const toolParams = {
        repo: this.prMetadata.repositoryUrl,
        maxFiles: 5 // Limit to avoid overwhelming the context
      };
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: codebaseTool.name,
          input: toolParams,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the codebase tool
      const codebaseData = await codebaseTool.execute(toolParams);
      
      // Update the tool use callback with the result
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName: codebaseTool.name,
          input: toolParams,
          output: codebaseData,
          error: undefined
        });
      }
      
      // Extract codebase context
      if (codebaseData && typeof codebaseData === 'object') {
        // Format the codebase context
        this.codebaseContext = Object.entries(codebaseData)
          .map(([filename, content]) => `File: ${filename}\n\`\`\`\n${content}\n\`\`\``)
          .join('\n\n');
      }
      
    } catch (error) {
      log(`Error fetching codebase context: ${error}`, 'agent');
      // Continue without codebase context
    }
  }

  /**
   * Analyze the PR files
   */
  private async analyzePRFiles(options: ProtocolExecutionOptions): Promise<void> {
    // If there are no PR files to analyze, return
    if (this.prFiles.length === 0) {
      return;
    }
    
    // Group files by type for more efficient analysis
    const fileGroups = this.groupFilesByType();
    
    // Analyze each file group
    for (const [fileType, files] of Object.entries(fileGroups)) {
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Analyzing ${fileType} Files`,
          description: `Analyzing ${files.length} ${fileType} files`,
          status: 'started'
        });
      }
      
      // Analyze files in this group
      await this.analyzeFileGroup(fileType, files, options);
      
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Analyzing ${fileType} Files`,
          description: `Analyzed ${files.length} ${fileType} files`,
          status: 'completed'
        });
      }
    }
  }

  /**
   * Group files by type for more efficient analysis
   */
  private groupFilesByType(): Record<string, PRFile[]> {
    const fileGroups: Record<string, PRFile[]> = {};
    
    for (const file of this.prFiles) {
      const extension = file.filename.split('.').pop() || 'unknown';
      
      // Group by file type
      let fileType = 'other';
      
      if (['js', 'ts', 'jsx', 'tsx'].includes(extension)) {
        fileType = 'javascript';
      } else if (['py'].includes(extension)) {
        fileType = 'python';
      } else if (['java', 'kt'].includes(extension)) {
        fileType = 'java';
      } else if (['rb'].includes(extension)) {
        fileType = 'ruby';
      } else if (['go'].includes(extension)) {
        fileType = 'go';
      } else if (['php'].includes(extension)) {
        fileType = 'php';
      } else if (['cs'].includes(extension)) {
        fileType = 'csharp';
      } else if (['html', 'css', 'scss', 'less'].includes(extension)) {
        fileType = 'frontend';
      } else if (['json', 'yaml', 'yml', 'xml', 'toml'].includes(extension)) {
        fileType = 'config';
      } else if (['md', 'txt', 'rst'].includes(extension)) {
        fileType = 'docs';
      }
      
      // Add to the appropriate group
      if (!fileGroups[fileType]) {
        fileGroups[fileType] = [];
      }
      
      fileGroups[fileType].push(file);
    }
    
    return fileGroups;
  }

  /**
   * Analyze a group of files
   */
  private async analyzeFileGroup(
    fileType: string, 
    files: PRFile[],
    options: ProtocolExecutionOptions
  ): Promise<void> {
    // Prepare analysis prompt
    const analysisPrompt = `Analyze the following ${fileType} files from a Pull Request:
    
${files.map(file => `File: ${file.filename}
Status: ${file.status}
Patch:
\`\`\`
${file.patch}
\`\`\`

${file.content ? `Full Content:
\`\`\`
${file.content}
\`\`\`
` : ''}
`).join('\n\n')}

${this.codebaseContext ? `\nCodebase context:\n${this.codebaseContext}` : ''}

Provide a detailed analysis of each file including:
1. What changed in the file
2. Why the change was made (based on code context and PR description)
3. Potential impact of these changes
4. Any potential issues, bugs, or improvements

The PR description is:
${this.prMetadata?.description || 'No description provided'}`;

    // Get analysis from LLM
    const analysis = await this.getResponseFromLLM(analysisPrompt);
    
    // Store analysis in file objects for later use
    for (const file of files) {
      file.analysis = analysis;
    }
  }

  /**
   * Generate PR summary
   */
  private async generatePRSummary(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.prMetadata) return;
    
    // Prepare summary prompt
    const summaryPrompt = `Create a concise summary for this Pull Request:
    
Title: ${this.prMetadata.title}
Description: ${this.prMetadata.description}
Author: ${this.prMetadata.author}
Files Changed: ${this.prMetadata.filesChanged}
Additions: ${this.prMetadata.additions}
Deletions: ${this.prMetadata.deletions}

${this.prFiles.length > 0 ? `Files in the PR:
${this.prFiles.map(file => `- ${file.filename} (${file.status})`).join('\n')}` : ''}

${this.prFiles.some(file => file.analysis) ? `File analyses:
${this.prFiles.filter(file => file.analysis).map(file => `File: ${file.filename}
Analysis: ${file.analysis}`).join('\n\n')}` : ''}

Create a 2-3 paragraph summary that:
1. Clearly explains what this PR does
2. Identifies the main components changed
3. Explains why these changes were made
4. Notes any significant implementation details

Use a professional, clear style. Be concise but thorough.`;

    // Get summary from LLM
    const summaryResponse = await this.getResponseFromLLM(summaryPrompt);
    
    // Initialize PR review with summary
    this.prReview = {
      summary: summaryResponse,
      description: 'PR review in progress',
      codeQuality: 0,
      bugRisk: 0,
      suggestions: [],
      overallFeedback: ''
    };
  }

  /**
   * Conduct code review
   */
  private async conductCodeReview(options: ProtocolExecutionOptions): Promise<void> {
    if (!this.prMetadata || !this.prReview) return;
    
    // Skip review if there are no files
    if (this.prFiles.length === 0) {
      this.prReview.description = 'No files to review';
      this.prReview.codeQuality = 5;
      this.prReview.bugRisk = 0;
      this.prReview.overallFeedback = 'No code changes to review';
      return;
    }
    
    // Prepare review prompt
    const reviewPrompt = `Conduct a thorough code review for this Pull Request:
    
Title: ${this.prMetadata.title}
Description: ${this.prMetadata.description}

Files to review:
${this.prFiles.map(file => `File: ${file.filename}
Status: ${file.status}
Patch:
\`\`\`
${file.patch}
\`\`\`
`).join('\n\n')}

Conduct a comprehensive code review that:
1. Identifies potential bugs, edge cases, or errors
2. Suggests code quality improvements (readability, maintainability)
3. Points out performance considerations
4. Checks for security issues
5. Reviews test coverage (if applicable)

For each suggestion, provide:
- The specific file and line number (if possible)
- A clear description of the issue
- The impact level (high/medium/low)
- A concrete suggestion for improvement

Also provide:
- A code quality score (1-10)
- A bug risk assessment (1-10)
- Overall constructive feedback

Be thorough but fair in your assessment.`;

    // Get review from LLM
    const reviewResponse = await this.getResponseFromLLM(reviewPrompt);
    
    // Parse review response to extract:
    // 1. Code quality score
    const qualityMatch = reviewResponse.match(/code quality score:?\s*(\d+)/i) || 
                        reviewResponse.match(/quality score:?\s*(\d+)/i) ||
                        reviewResponse.match(/quality:?\s*(\d+)/i);
    
    // 2. Bug risk score
    const bugRiskMatch = reviewResponse.match(/bug risk:?\s*(\d+)/i) || 
                         reviewResponse.match(/risk assessment:?\s*(\d+)/i) ||
                         reviewResponse.match(/risk:?\s*(\d+)/i);
    
    // 3. Overall feedback
    const feedbackMatch = reviewResponse.match(/overall feedback:?\s*([\s\S]+?)(?=\n\n|$)/i) ||
                          reviewResponse.match(/overall:?\s*([\s\S]+?)(?=\n\n|$)/i);
    
    // 4. Extract suggestions
    const suggestions: Array<{
      file: string;
      lineNumber?: number;
      suggestion: string;
      impact: 'high' | 'medium' | 'low';
      type: 'improvement' | 'bug' | 'security' | 'performance' | 'style' | 'documentation';
    }> = [];
    
    // Look for suggestion patterns in the review
    const suggestionBlocks = reviewResponse.match(/suggestion(?:[^:]*):?(?:[\s\S]*?)(?=suggestion|$)/gi) || [];
    
    for (const block of suggestionBlocks) {
      // Extract file
      const fileMatch = block.match(/file:?\s*([^\n]+)/i);
      
      // Extract line number if present
      const lineMatch = block.match(/line:?\s*(\d+)/i) || block.match(/line number:?\s*(\d+)/i);
      
      // Extract impact
      const impactMatch = block.match(/impact:?\s*(high|medium|low)/i);
      
      // Extract type
      const typeMatch = block.match(/type:?\s*(improvement|bug|security|performance|style|documentation)/i);
      
      // Extract the suggestion itself
      const suggestionMatch = block.match(/(?:description|details|issue|problem):?\s*([^\n]+(?:\n(?!\n)[^\n]+)*)/i);
      
      if (fileMatch && suggestionMatch) {
        suggestions.push({
          file: fileMatch[1].trim(),
          lineNumber: lineMatch ? parseInt(lineMatch[1]) : undefined,
          suggestion: suggestionMatch[1].trim(),
          impact: (impactMatch ? impactMatch[1].toLowerCase() : 'medium') as 'high' | 'medium' | 'low',
          type: (typeMatch ? typeMatch[1].toLowerCase() : 'improvement') as 'improvement' | 'bug' | 'security' | 'performance' | 'style' | 'documentation'
        });
      }
    }
    
    // Update PR review with extracted information
    this.prReview.description = reviewResponse;
    this.prReview.codeQuality = qualityMatch ? Math.min(Math.max(parseInt(qualityMatch[1]), 1), 10) : 5;
    this.prReview.bugRisk = bugRiskMatch ? Math.min(Math.max(parseInt(bugRiskMatch[1]), 0), 10) : 0;
    this.prReview.overallFeedback = feedbackMatch ? feedbackMatch[1].trim() : 'No overall feedback provided';
    this.prReview.suggestions = suggestions;
  }

  /**
   * Generate final PR review report
   */
  private async generateFinalReport(options: ProtocolExecutionOptions): Promise<string> {
    if (!this.prMetadata || !this.prReview) {
      return 'Unable to generate PR review report due to missing data';
    }
    
    let report = `# PR Review: ${this.prMetadata.title}\n\n`;
    
    // Add PR metadata
    report += `## Pull Request Information\n`;
    report += `- **Title**: ${this.prMetadata.title}\n`;
    report += `- **Author**: ${this.prMetadata.author}\n`;
    report += `- **Branch**: ${this.prMetadata.headBranch} → ${this.prMetadata.baseBranch}\n`;
    report += `- **Files Changed**: ${this.prMetadata.filesChanged}\n`;
    report += `- **Lines Added**: ${this.prMetadata.additions}\n`;
    report += `- **Lines Deleted**: ${this.prMetadata.deletions}\n\n`;
    
    // Add PR summary
    report += `## Summary\n${this.prReview.summary}\n\n`;
    
    // Add quality metrics
    report += `## Code Review Metrics\n`;
    report += `- **Code Quality**: ${this.prReview.codeQuality}/10\n`;
    report += `- **Bug Risk**: ${this.prReview.bugRisk}/10\n\n`;
    
    // Add suggestions if any
    if (this.prReview.suggestions.length > 0) {
      report += `## Suggestions\n\n`;
      
      // Group suggestions by file
      const suggestionsByFile: Record<string, typeof this.prReview.suggestions> = {};
      
      for (const suggestion of this.prReview.suggestions) {
        if (!suggestionsByFile[suggestion.file]) {
          suggestionsByFile[suggestion.file] = [];
        }
        suggestionsByFile[suggestion.file].push(suggestion);
      }
      
      // Add suggestions by file
      for (const [file, suggestions] of Object.entries(suggestionsByFile)) {
        report += `### File: ${file}\n\n`;
        
        for (const suggestion of suggestions) {
          const impact = suggestion.impact === 'high' ? '🔴' : suggestion.impact === 'medium' ? '🟠' : '🟡';
          const type = suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1);
          
          report += `${impact} **${type}**${suggestion.lineNumber ? ` (Line ${suggestion.lineNumber})` : ''}\n`;
          report += `${suggestion.suggestion}\n\n`;
        }
      }
    }
    
    // Add overall feedback
    report += `## Overall Feedback\n${this.prReview.overallFeedback}\n\n`;
    
    // Add next steps/recommendation section
    const nextStepsPrompt = `Based on the PR review summary:

${this.prReview.summary}

And the suggestions:
${this.prReview.suggestions.map(s => `- ${s.suggestion} (${s.impact} impact)`).join('\n')}

Generate a concise "Next Steps" section with 3-5 bullet points recommending what the author should do next to improve this PR.`;

    const nextSteps = await this.getResponseFromLLM(nextStepsPrompt);
    report += `## Next Steps\n${nextSteps}\n\n`;
    
    // Add reviewer signature
    report += `---\n*Review generated by Qodo PR-Agent*\n`;
    
    return report;
  }

  /**
   * Get the tool calls history
   */
  private getToolCallsHistory(): Array<{name: string, input: Record<string, any>, output: any}> | undefined {
    // In a real implementation, we'd track tool calls during execution
    return undefined;
  }

  /**
   * Get response from the appropriate LLM based on model name
   */
  private async getResponseFromLLM(prompt: string): Promise<string> {
    try {
      if (this.config.modelName?.includes('claude')) {
        return await this.getResponseFromClaude(prompt);
      } else if (this.config.modelName?.includes('gpt')) {
        return await this.getResponseFromOpenAI(prompt);
      } else {
        // Default to Claude
        return await this.getResponseFromClaude(prompt);
      }
    } catch (error) {
      log(`Error getting LLM response: ${error}`, 'agent');
      throw error;
    }
  }

  /**
   * Get response from Claude
   */
  private async getResponseFromClaude(prompt: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }
    
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: this.config.systemPrompt,
      messages: [{ role: 'user', content: prompt }]
    });
    
    return response.content[0].text;
  }

  /**
   * Get response from OpenAI
   */
  private async getResponseFromOpenAI(prompt: string): Promise<string> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }
    
    const response = await this.openaiClient.chat.completions.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: [
        { role: 'system', content: this.config.systemPrompt },
        { role: 'user', content: prompt }
      ]
    });
    
    return response.choices[0].message.content || '';
  }

  /**
   * Get available tools
   */
  public getAvailableTools(): AgentTool[] {
    return this.availableTools;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<ProtocolConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Update available tools if provided
    if (config.tools) {
      this.availableTools = config.tools;
    }
  }

  /**
   * Get supported execution modes
   */
  public getSupportedExecutionModes(): ExecutionMode[] {
    return [ExecutionMode.SYNCHRONOUS];
  }

  /**
   * Check if protocol supports a specific capability
   */
  public supportsCapability(capability: ProtocolCapabilities): boolean {
    return this.config.capabilities.includes(capability);
  }

  /**
   * Get current protocol configuration
   */
  public getConfig(): ProtocolConfig {
    return this.config;
  }

  /**
   * Clean up resources
   */
  public async cleanup(): Promise<void> {
    // Reset PR state
    this.prFiles = [];
    this.prMetadata = null;
    this.prReview = null;
    this.codebaseContext = '';
    this.initialized = false;
    
    return Promise.resolve();
  }
}