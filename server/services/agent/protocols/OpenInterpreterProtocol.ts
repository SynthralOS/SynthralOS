/**
 * Open Interpreter Protocol Implementation
 * 
 * Implements a protocol inspired by Open Interpreter for
 * LLM-powered code execution and correction.
 */

import { 
  BaseProtocol, 
  ProtocolCapabilities, 
  ProtocolConfig, 
  ProtocolMetadata, 
  ProtocolExecutionOptions,
  ExecutionMode
} from './BaseProtocol';
import { AgentTool, AgentResponse } from '../agent';
import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../../vite';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

// Promisify exec for async usage
const execAsync = promisify(exec);

// The newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = 'claude-3-7-sonnet-20250219';

// Supported programming languages
export enum SupportedLanguage {
  PYTHON = 'python',
  JAVASCRIPT = 'javascript',
  TYPESCRIPT = 'typescript',
  BASH = 'bash',
  SQL = 'sql'
}

// Code execution result
interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
}

// Command to use for executing different languages
const languageCommands: Record<SupportedLanguage, string> = {
  [SupportedLanguage.PYTHON]: 'python',
  [SupportedLanguage.JAVASCRIPT]: 'node',
  [SupportedLanguage.TYPESCRIPT]: 'tsx',
  [SupportedLanguage.BASH]: 'bash',
  [SupportedLanguage.SQL]: 'sqlite3'
};

export class OpenInterpreterProtocol implements BaseProtocol {
  private config: ProtocolConfig = {
    systemPrompt: 'You are a code interpreter that can write and execute code to solve tasks.',
    tools: [],
    modelName: DEFAULT_MODEL,
    temperature: 0.5,
    maxTokens: 4096,
    capabilities: [
      ProtocolCapabilities.MULTI_STEP,
      ProtocolCapabilities.CODE_EXECUTION,
      ProtocolCapabilities.SELF_CORRECTION,
      ProtocolCapabilities.TOOL_USE
    ],
    allowedLanguages: Object.values(SupportedLanguage),
    maxExecutions: 5, // Maximum number of code execution attempts
    sandboxed: true, // Whether to run in a sandboxed environment
    workingDir: './tmp', // Working directory for code execution
  };

  private anthropicClient: Anthropic | null = null;
  private availableTools: AgentTool[] = [];
  private initialized: boolean = false;
  private codeHistory: Array<{
    language: SupportedLanguage;
    code: string;
    result?: CodeExecutionResult;
    error?: string;
  }> = [];

  /**
   * Get metadata about this protocol
   */
  public getMetadata(): ProtocolMetadata {
    return {
      name: 'OpenInterpreter',
      version: '1.0.0',
      description: 'Protocol for LLM-powered code execution and correction',
      capabilities: [
        ProtocolCapabilities.MULTI_STEP,
        ProtocolCapabilities.CODE_EXECUTION,
        ProtocolCapabilities.SELF_CORRECTION,
        ProtocolCapabilities.TOOL_USE
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
    }
    
    // Store available tools
    this.availableTools = this.config.tools || [];
    
    // Create working directory if it doesn't exist
    const workingDir = this.config.workingDir as string;
    try {
      await fs.mkdir(workingDir, { recursive: true });
    } catch (error) {
      log(`Error creating working directory: ${error}`, 'agent');
    }
    
    // Reset execution state
    this.codeHistory = [];
    
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

      // Generate and execute code to solve the task
      const result = await this.solveTaskWithCode(options.task, options);
      
      // Create the agent response
      const agentResponse: AgentResponse = {
        response: result.finalSummary,
        usedTools: result.toolExecutions,
        thinking: this.getCodeExecutionHistory(),
        executionTime: Date.now() - startTime
      };
      
      // Call onComplete callback if provided
      if (options.callbacks?.onComplete) {
        options.callbacks.onComplete(agentResponse);
      }
      
      return agentResponse;
    } catch (error) {
      log(`OpenInterpreter Protocol execution error: ${error}`, 'agent');
      
      // Call onError callback if provided
      if (options.callbacks?.onError) {
        options.callbacks.onError(error as Error);
      }
      
      throw error;
    }
  }

  /**
   * Solve a task by generating and executing code
   */
  private async solveTaskWithCode(
    task: string,
    options: ProtocolExecutionOptions
  ): Promise<{
    finalSummary: string;
    toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}>;
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const maxExecutions = this.config.maxExecutions as number;
    const tools = options.tools || this.availableTools;
    const toolExecutions: Array<{tool: string, input: Record<string, any>, output: any}> = [];
    
    // Call onStep callback for initial analysis if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Task Analysis',
        description: 'Analyzing the task and determining approach',
        status: 'started'
      });
    }
    
    // Generate initial code to solve the task
    const initialCodeGeneration = await this.generateCode(task, null);
    
    // Log the initial code generation
    this.codeHistory.push({
      language: initialCodeGeneration.language,
      code: initialCodeGeneration.code
    });
    
    // Call onStep callback for code generation if provided
    if (options.callbacks?.onStep) {
      options.callbacks.onStep({
        name: 'Code Generation',
        description: `Generated initial ${initialCodeGeneration.language} code`,
        output: initialCodeGeneration.code,
        status: 'completed'
      });
    }
    
    let currentCode = initialCodeGeneration.code;
    let currentLanguage = initialCodeGeneration.language;
    let finalOutput: string | null = null;
    let executionCount = 0;
    
    // Iterate until we have a solution or reach max executions
    while (executionCount < maxExecutions && finalOutput === null) {
      executionCount++;
      
      // Call onStep callback for execution attempt if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: `Execution Attempt ${executionCount}`,
          description: `Executing ${currentLanguage} code (attempt ${executionCount})`,
          status: 'started'
        });
      }
      
      try {
        // Execute the code
        const executionResult = await this.executeCode(currentLanguage, currentCode);
        
        // Update the code history
        this.codeHistory[this.codeHistory.length - 1].result = executionResult;
        
        // Call onStep callback for execution result if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Execution Attempt ${executionCount}`,
            description: `Executed ${currentLanguage} code (attempt ${executionCount})`,
            output: `stdout: ${executionResult.stdout}\nstderr: ${executionResult.stderr}\nexit code: ${executionResult.exitCode}`,
            status: 'completed'
          });
        }
        
        // Check if execution was successful
        if (executionResult.exitCode === 0) {
          // Determine if the task is solved or needs more work
          const evaluationResult = await this.evaluateExecution(
            task,
            currentLanguage,
            currentCode,
            executionResult
          );
          
          if (evaluationResult.solved) {
            // Task is solved
            finalOutput = evaluationResult.explanation;
            
            // Call onStep callback for completion if provided
            if (options.callbacks?.onStep) {
              options.callbacks.onStep({
                name: 'Task Completion',
                description: 'Task successfully solved with code execution',
                output: finalOutput,
                status: 'completed'
              });
            }
          } else {
            // Task needs more work, generate improved code
            const improvedCode = await this.generateCode(
              task,
              {
                previousCode: currentCode,
                previousLanguage: currentLanguage,
                executionResult,
                feedback: evaluationResult.explanation
              }
            );
            
            // Update current code and language
            currentCode = improvedCode.code;
            currentLanguage = improvedCode.language;
            
            // Log the improved code generation
            this.codeHistory.push({
              language: improvedCode.language,
              code: improvedCode.code
            });
            
            // Call onStep callback for code improvement if provided
            if (options.callbacks?.onStep) {
              options.callbacks.onStep({
                name: 'Code Improvement',
                description: `Generated improved ${improvedCode.language} code`,
                output: improvedCode.code,
                status: 'completed'
              });
            }
          }
        } else {
          // Execution failed, generate fixed code
          const fixedCode = await this.generateCode(
            task,
            {
              previousCode: currentCode,
              previousLanguage: currentLanguage,
              executionResult,
              feedback: `Execution failed with exit code ${executionResult.exitCode}. Error: ${executionResult.stderr}`
            }
          );
          
          // Update current code and language
          currentCode = fixedCode.code;
          currentLanguage = fixedCode.language;
          
          // Log the fixed code generation
          this.codeHistory.push({
            language: fixedCode.language,
            code: fixedCode.code
          });
          
          // Call onStep callback for code fixing if provided
          if (options.callbacks?.onStep) {
            options.callbacks.onStep({
              name: 'Code Fixing',
              description: `Generated fixed ${fixedCode.language} code`,
              output: fixedCode.code,
              status: 'completed'
            });
          }
        }
      } catch (error) {
        // Execution error (not code error, but system error)
        const errorMessage = (error as Error).message;
        
        // Update the code history
        this.codeHistory[this.codeHistory.length - 1].error = errorMessage;
        
        // Call onStep callback for execution error if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: `Execution Attempt ${executionCount}`,
            description: `Executing ${currentLanguage} code (attempt ${executionCount})`,
            error: errorMessage,
            status: 'failed'
          });
        }
        
        // Generate fixed code
        const fixedCode = await this.generateCode(
          task,
          {
            previousCode: currentCode,
            previousLanguage: currentLanguage,
            feedback: `Execution encountered a system error: ${errorMessage}`
          }
        );
        
        // Update current code and language
        currentCode = fixedCode.code;
        currentLanguage = fixedCode.language;
        
        // Log the fixed code generation
        this.codeHistory.push({
          language: fixedCode.language,
          code: fixedCode.code
        });
        
        // Call onStep callback for code fixing if provided
        if (options.callbacks?.onStep) {
          options.callbacks.onStep({
            name: 'Code Fixing',
            description: `Generated fixed ${fixedCode.language} code after system error`,
            output: fixedCode.code,
            status: 'completed'
          });
        }
      }
      
      // If using tools, check if any tool executions are needed
      if (tools.length > 0 && executionCount === maxExecutions && finalOutput === null) {
        // As a last resort, try using tools
        try {
          const toolResult = await this.attemptToolUse(task, tools, options);
          
          if (toolResult) {
            toolExecutions.push(toolResult);
            finalOutput = `I used the ${toolResult.tool} tool to help solve this task:\n\n${JSON.stringify(toolResult.output, null, 2)}`;
            
            // Call onStep callback for tool use if provided
            if (options.callbacks?.onStep) {
              options.callbacks.onStep({
                name: 'Tool Usage',
                description: `Used ${toolResult.tool} tool as fallback`,
                output: JSON.stringify(toolResult.output),
                status: 'completed'
              });
            }
          }
        } catch (error) {
          log(`Error using tools as fallback: ${error}`, 'agent');
        }
      }
    }
    
    // If we still don't have a solution, generate a final summary of what happened
    if (finalOutput === null) {
      finalOutput = await this.generateFinalSummary(task);
      
      // Call onStep callback for final summary if provided
      if (options.callbacks?.onStep) {
        options.callbacks.onStep({
          name: 'Final Summary',
          description: 'Generated summary of execution attempts',
          output: finalOutput,
          status: 'completed'
        });
      }
    }
    
    return {
      finalSummary: finalOutput,
      toolExecutions
    };
  }

  /**
   * Generate code to solve a task
   */
  private async generateCode(
    task: string,
    context: {
      previousCode?: string;
      previousLanguage?: SupportedLanguage;
      executionResult?: CodeExecutionResult;
      feedback?: string;
    } | null
  ): Promise<{
    language: SupportedLanguage;
    code: string;
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const allowedLanguages = this.config.allowedLanguages as SupportedLanguage[];
    
    // Prepare system prompt for code generation
    let codePrompt = `${this.config.systemPrompt}

You are a code interpreter that can write and execute code to solve tasks. Your goal is to write code that solves the given task. You should:

1. Choose the most appropriate programming language for the task from: ${allowedLanguages.join(', ')}
2. Write clear, efficient, and correct code
3. Include helpful comments to explain your approach
4. Ensure the code is complete and ready to execute
5. Assume standard libraries are available but specify any non-standard dependencies`;

    // Add context about previous attempts if available
    if (context) {
      codePrompt += `\n\nContext from previous attempt:
      
Programming language: ${context.previousLanguage || 'Not specified'}

Previous code:
\`\`\`${context.previousLanguage || ''}
${context.previousCode || 'No previous code'}
\`\`\`

${context.executionResult ? `Execution result:
- stdout: ${context.executionResult.stdout}
- stderr: ${context.executionResult.stderr}
- exit code: ${context.executionResult.exitCode}
- execution time: ${context.executionResult.executionTime}ms` : ''}

${context.feedback ? `Feedback: ${context.feedback}` : ''}

Based on this context, please improve the code to better solve the task. You can:
1. Fix any errors in the previous code
2. Improve the algorithm or approach
3. Add missing functionality
4. Switch to a different programming language if appropriate`;
    }

    // Complete the prompt
    codePrompt += `\n\nRespond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about how to approach the task",
  "language": "The programming language you chose (must be one of the allowed languages)",
  "code": "Your complete code solution"
}`;

    // Generate the code
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      system: codePrompt,
      messages: [{ role: 'user', content: `Task: ${task}` }]
    });
    
    // Parse the response
    const content = response.content[0].text;
    return this.parseCodeFromResponse(content, allowedLanguages);
  }

  /**
   * Parse code from the LLM response
   */
  private async parseCodeFromResponse(
    content: string,
    allowedLanguages: SupportedLanguage[]
  ): Promise<{
    language: SupportedLanguage;
    code: string;
  }> {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        // Try to extract code blocks directly
        const codeBlockMatch = content.match(/```([a-zA-Z0-9]+)\n([\s\S]*?)\n```/);
        
        if (codeBlockMatch) {
          const language = codeBlockMatch[1].toLowerCase() as SupportedLanguage;
          const code = codeBlockMatch[2];
          
          // Check if language is allowed
          if (allowedLanguages.includes(language)) {
            return { language, code };
          } else {
            // Default to first allowed language
            return { language: allowedLanguages[0], code };
          }
        }
        
        throw new Error('Could not extract code or JSON from response');
      }
      
      let responseJson;
      try {
        responseJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        try {
          responseJson = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          throw new Error('Invalid JSON format in response');
        }
      }
      
      // Extract language and code
      let language = responseJson.language?.toLowerCase() as SupportedLanguage;
      const code = responseJson.code || '';
      
      // Check if language is allowed
      if (!language || !allowedLanguages.includes(language)) {
        // Default to first allowed language
        language = allowedLanguages[0];
      }
      
      return { language, code };
    } catch (error) {
      log(`Error parsing code from response: ${error}`, 'agent');
      
      // Return a default response
      return {
        language: allowedLanguages[0],
        code: content
      };
    }
  }

  /**
   * Execute code
   */
  private async executeCode(
    language: SupportedLanguage,
    code: string
  ): Promise<CodeExecutionResult> {
    // Get the command for executing this language
    const command = languageCommands[language];
    
    if (!command) {
      throw new Error(`Unsupported language: ${language}`);
    }
    
    const workingDir = this.config.workingDir as string;
    
    // Create a temporary file for the code
    const extension = this.getFileExtension(language);
    const filename = `code_${Date.now()}_${Math.random().toString(36).substring(2, 9)}${extension}`;
    const filepath = path.join(workingDir, filename);
    
    try {
      // Write code to file
      await fs.writeFile(filepath, code);
      
      // Execute the code
      const startTime = Date.now();
      
      // Different execution approaches for different languages
      let result;
      if (language === SupportedLanguage.SQL) {
        // For SQL, create a temporary database
        const dbPath = path.join(workingDir, `db_${Date.now()}.sqlite`);
        result = await execAsync(`${command} ${dbPath} < ${filepath}`);
      } else {
        // For other languages, execute directly
        result = await execAsync(`${command} ${filepath}`, {
          cwd: workingDir,
          timeout: 30000 // 30 second timeout
        });
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0,
        executionTime
      };
    } catch (error: any) {
      // Command execution failed
      return {
        stdout: error.stdout || '',
        stderr: error.stderr || error.message,
        exitCode: error.code || 1,
        executionTime: 0
      };
    } finally {
      // Clean up the file
      try {
        await fs.unlink(filepath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Evaluate if the execution solved the task
   */
  private async evaluateExecution(
    task: string,
    language: SupportedLanguage,
    code: string,
    executionResult: CodeExecutionResult
  ): Promise<{
    solved: boolean;
    explanation: string;
  }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for evaluation
    const evaluationPrompt = `${this.config.systemPrompt}

You are evaluating whether a code execution successfully solved a given task. Your goal is to determine if the task is fully solved or if more work is needed.

Task: ${task}

Code (${language}):
\`\`\`${language}
${code}
\`\`\`

Execution result:
- stdout: ${executionResult.stdout}
- stderr: ${executionResult.stderr}
- exit code: ${executionResult.exitCode}
- execution time: ${executionResult.executionTime}ms

Please analyze:
1. Does the code correctly implement a solution to the task?
2. Does the execution result indicate success?
3. Are there any errors or warnings that need to be addressed?
4. Is the output correct and complete?
5. Is there anything missing or any improvements needed?

Respond with a JSON object in the following format:
{
  "solved": true/false,
  "explanation": "Your detailed explanation of why the task is solved or what still needs to be done"
}`;

    // Generate the evaluation
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.3, // Lower temperature for more consistent evaluation
      system: evaluationPrompt,
      messages: [{ role: 'user', content: 'Evaluate code execution result' }]
    });
    
    // Parse the response
    try {
      const content = response.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        // Default to not solved if can't parse
        return {
          solved: false,
          explanation: 'Could not parse evaluation response'
        };
      }
      
      let evaluationJson;
      try {
        evaluationJson = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        try {
          evaluationJson = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          throw new Error('Invalid JSON format in evaluation response');
        }
      }
      
      return {
        solved: evaluationJson.solved === true,
        explanation: evaluationJson.explanation || 'No explanation provided'
      };
    } catch (error) {
      log(`Error parsing evaluation: ${error}`, 'agent');
      
      // Default to not solved if there's an error
      return {
        solved: false,
        explanation: `Error evaluating result: ${(error as Error).message}`
      };
    }
  }

  /**
   * Generate a final summary of execution attempts
   */
  private async generateFinalSummary(task: string): Promise<string> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    // Prepare system prompt for final summary
    const summaryPrompt = `${this.config.systemPrompt}

You are generating a final summary of code execution attempts for a task. Your goal is to explain what was attempted, what worked, what didn't work, and what could be done differently.

Task: ${task}

Code execution history:
${this.codeHistory.map((entry, index) => `
Attempt ${index + 1} (${entry.language}):
\`\`\`${entry.language}
${entry.code}
\`\`\`

${entry.result ? `Execution result:
- stdout: ${entry.result.stdout}
- stderr: ${entry.result.stderr}
- exit code: ${entry.result.exitCode}
- execution time: ${entry.result.executionTime}ms` : entry.error ? `Execution error: ${entry.error}` : 'No execution information'}`).join('\n\n')}

Please provide a comprehensive summary that:
1. Explains the overall approach taken
2. Highlights what worked and what didn't
3. Analyzes the main challenges encountered
4. Suggests what could be done differently
5. Provides the most useful output or results from the attempts

Your summary should be informative and help the user understand the outcome of the code execution attempts.`;

    // Generate the summary
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5,
      system: summaryPrompt,
      messages: [{ role: 'user', content: 'Generate a final summary of code execution attempts' }]
    });
    
    return response.content[0].text;
  }

  /**
   * Attempt to use a tool as a fallback
   */
  private async attemptToolUse(
    task: string,
    tools: AgentTool[],
    options: ProtocolExecutionOptions
  ): Promise<{tool: string, input: Record<string, any>, output: any} | null> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    if (tools.length === 0) {
      return null;
    }

    // Prepare system prompt for tool selection
    const toolPrompt = `${this.config.systemPrompt}

You are selecting a tool to help solve a task after code execution attempts have failed. Your goal is to choose the most appropriate tool and provide the correct inputs.

Task: ${task}

Code execution history:
${this.codeHistory.map((entry, index) => `
Attempt ${index + 1} (${entry.language}):
\`\`\`${entry.language}
${entry.code}
\`\`\`

${entry.result ? `Execution result:
- stdout: ${entry.result.stdout}
- stderr: ${entry.result.stderr}
- exit code: ${entry.result.exitCode}
- execution time: ${entry.result.executionTime}ms` : entry.error ? `Execution error: ${entry.error}` : 'No execution information'}`).join('\n\n')}

Available tools:
${tools.map(tool => {
  return `- ${tool.name}: ${tool.description}
  Parameters:
${Object.entries(tool.parameters).map(([paramName, paramInfo]) => {
  return `    - ${paramName} (${paramInfo.type}${paramInfo.required ? ', required' : ''}): ${paramInfo.description}`;
}).join('\n')}`;
}).join('\n\n')}

Choose the most appropriate tool to help solve this task. Respond with a JSON object in the following format:
{
  "reasoning": "Your step-by-step reasoning about which tool to use and why",
  "tool": "tool_name",
  "input": {
    "param1": "value1",
    ...
  }
}`;

    // Generate the tool selection
    const response = await this.anthropicClient.messages.create({
      model: this.config.modelName as string,
      max_tokens: this.config.maxTokens,
      temperature: 0.5,
      system: toolPrompt,
      messages: [{ role: 'user', content: 'Select a tool to help solve the task' }]
    });
    
    // Parse the response
    try {
      const content = response.content[0].text;
      
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
      
      if (!jsonMatch) {
        return null;
      }
      
      let toolSelection;
      try {
        toolSelection = JSON.parse(jsonMatch[0].replace(/```json\n|```/g, ''));
      } catch (e) {
        try {
          toolSelection = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          return null;
        }
      }
      
      const toolName = toolSelection.tool;
      const toolInput = toolSelection.input;
      
      // Find the tool
      const tool = tools.find(t => t.name === toolName);
      
      if (!tool) {
        return null;
      }
      
      // Call onToolUse callback if provided
      if (options.callbacks?.onToolUse) {
        options.callbacks.onToolUse({
          toolName,
          input: toolInput,
          output: undefined,
          error: undefined
        });
      }
      
      // Execute the tool
      try {
        const result = await tool.execute(toolInput);
        
        // Update the tool use callback with the result
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName,
            input: toolInput,
            output: result,
            error: undefined
          });
        }
        
        return {
          tool: toolName,
          input: toolInput,
          output: result
        };
      } catch (error) {
        // Handle tool execution error
        log(`Error executing ${toolName}: ${error}`, 'agent');
        
        // Update the tool use callback with the error
        if (options.callbacks?.onToolUse) {
          options.callbacks.onToolUse({
            toolName,
            input: toolInput,
            output: undefined,
            error: (error as Error).message
          });
        }
        
        return null;
      }
    } catch (error) {
      log(`Error parsing tool selection: ${error}`, 'agent');
      return null;
    }
  }

  /**
   * Get file extension for a language
   */
  private getFileExtension(language: SupportedLanguage): string {
    switch (language) {
      case SupportedLanguage.PYTHON:
        return '.py';
      case SupportedLanguage.JAVASCRIPT:
        return '.js';
      case SupportedLanguage.TYPESCRIPT:
        return '.ts';
      case SupportedLanguage.BASH:
        return '.sh';
      case SupportedLanguage.SQL:
        return '.sql';
      default:
        return '.txt';
    }
  }

  /**
   * Get code execution history as formatted string
   */
  private getCodeExecutionHistory(): string {
    return this.codeHistory.map((entry, index) => {
      return `# Attempt ${index + 1} (${entry.language})

\`\`\`${entry.language}
${entry.code}
\`\`\`

${entry.result ? `## Execution Result
\`\`\`
stdout: ${entry.result.stdout}
stderr: ${entry.result.stderr}
exit code: ${entry.result.exitCode}
execution time: ${entry.result.executionTime}ms
\`\`\`` : entry.error ? `## Execution Error\n\`\`\`\n${entry.error}\n\`\`\`` : '## No Execution Information'}`;
    }).join('\n\n---\n\n');
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
    // Clean up working directory
    const workingDir = this.config.workingDir as string;
    try {
      // Don't delete the directory itself, just all files in it
      const files = await fs.readdir(workingDir);
      
      for (const file of files) {
        await fs.unlink(path.join(workingDir, file));
      }
    } catch (error) {
      log(`Error cleaning up working directory: ${error}`, 'agent');
    }
    
    // Reset execution state
    this.codeHistory = [];
    this.initialized = false;
    
    return Promise.resolve();
  }
}