/**
 * Agent Task Queue with Retry Mechanisms
 * 
 * This module provides a task queue with retry capabilities for agent operations.
 * In development mode, it provides a mock implementation.
 */

export enum RetryStrategy {
  LINEAR = 'linear',
  EXPONENTIAL = 'exponential',
  FIXED = 'fixed'
}

export interface RetryConfig {
  strategy: RetryStrategy;
  maxAttempts: number;
  baseDelay: number;
  fallbackProtocols?: string[];
}

export interface AgentTaskJobData {
  id: string;
  task: string;
  protocol: string;
  tools?: string[];
  options?: Record<string, any>;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt?: number;
  currentProtocolIndex?: number;
  protocols?: string[];
}

export interface AgentTaskResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Agent Task Queue with BullMQ
 * 
 * Provides a task queue with retry capabilities for agent operations.
 * Requires Redis to be available.
 */
export class AgentTaskQueue {
  private queueName: string;
  private processFn: (job: any) => Promise<AgentTaskResult>;
  private retryConfig: RetryConfig;
  private queue: any;
  private worker: any;
  
  constructor(
    queueName: string,
    processFn: (job: any) => Promise<AgentTaskResult>,
    retryConfig: RetryConfig
  ) {
    this.queueName = queueName;
    this.processFn = processFn;
    this.retryConfig = retryConfig;
    
    console.log('Task queue with BullMQ is not available in this demo version');
  }
  
  /**
   * Add a task to the queue
   * 
   * @param task Task description
   * @param protocol Protocol to use
   * @param tools Optional tools to use
   * @param options Optional settings
   * @returns Job ID
   */
  async addTask(
    task: string,
    protocol: string,
    tools?: string[],
    options?: Record<string, any>
  ): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    console.log(`Adding task to queue: ${jobId}`, {
      task: task.substring(0, 50) + '...',
      protocol,
      tools,
      options
    });
    
    // In a real implementation, we would add the job to BullMQ
    // This is mocked for the demo version
    
    return jobId;
  }
  
  /**
   * Get the status of a job
   * 
   * @param jobId Job ID to check
   * @returns Job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<any> {
    console.log(`Checking job status: ${jobId}`);
    
    // In a real implementation, we would check the job status in BullMQ
    // This is mocked for the demo version
    
    return {
      id: jobId,
      status: 'completed',
      result: {
        success: true,
        data: { message: 'Task completed successfully (mock)' }
      }
    };
  }
  
  /**
   * Close the queue and worker
   */
  async close(): Promise<void> {
    console.log('Closing queue and worker');
    
    // In a real implementation, we would close the BullMQ queue and worker
    // This is mocked for the demo version
  }
}

/**
 * Mock Agent Task Queue
 * 
 * Provides a mock implementation of the task queue for development.
 * Does not require Redis or other external dependencies.
 */
export class MockAgentTaskQueue {
  private queueName: string;
  private processFn: (job: any) => Promise<AgentTaskResult>;
  private retryConfig: RetryConfig;
  private jobs: Map<string, AgentTaskJobData> = new Map();
  private results: Map<string, AgentTaskResult> = new Map();
  
  constructor(
    queueName: string,
    processFn: (job: any) => Promise<AgentTaskResult>,
    retryConfig: RetryConfig
  ) {
    this.queueName = queueName;
    this.processFn = processFn;
    this.retryConfig = retryConfig;
    
    console.log('Using mock task queue for development');
  }
  
  /**
   * Add a task to the queue
   * 
   * @param task Task description
   * @param protocol Protocol to use
   * @param tools Optional tools to use
   * @param options Optional settings
   * @returns Job ID
   */
  async addTask(
    task: string,
    protocol: string,
    tools?: string[],
    options?: Record<string, any>
  ): Promise<string> {
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    console.log(`Adding task to mock queue: ${jobId}`, {
      task: task.substring(0, 50) + '...',
      protocol,
      tools,
      options
    });
    
    // Create job data
    const jobData: AgentTaskJobData = {
      id: jobId,
      task,
      protocol,
      tools,
      options,
      attempts: 0,
      maxAttempts: this.retryConfig.maxAttempts,
      protocols: [protocol, ...(this.retryConfig.fallbackProtocols || [])]
    };
    
    // Store job
    this.jobs.set(jobId, jobData);
    
    // Process job immediately (asynchronously)
    this.processJob(jobId);
    
    return jobId;
  }
  
  /**
   * Process a job
   * 
   * @param jobId Job ID to process
   */
  private async processJob(jobId: string): Promise<void> {
    const jobData = this.jobs.get(jobId);
    
    if (!jobData) {
      console.error(`Job ${jobId} not found`);
      return;
    }
    
    try {
      // Increment attempt counter
      jobData.attempts++;
      
      // Process job
      const result = await this.processFn(jobData);
      
      // Store result
      this.results.set(jobId, result);
      
      // Handle failure and retry if needed
      if (!result.success && jobData.attempts < jobData.maxAttempts) {
        // Retry with fallback protocol if available
        if (this.retryConfig.fallbackProtocols && this.retryConfig.fallbackProtocols.length > 0) {
          const currentProtocolIndex = jobData.currentProtocolIndex || 0;
          const nextProtocolIndex = currentProtocolIndex + 1;
          
          if (nextProtocolIndex < jobData.protocols!.length) {
            const nextProtocol = jobData.protocols![nextProtocolIndex];
            console.log(`Retrying job ${jobId} with fallback protocol: ${nextProtocol}`);
            
            // Update job data for retry
            jobData.protocol = nextProtocol;
            jobData.currentProtocolIndex = nextProtocolIndex;
            
            // Schedule retry (simulated)
            setTimeout(() => this.processJob(jobId), this.calculateRetryDelay(jobData.attempts));
            return;
          }
        }
        
        // Retry with same protocol
        console.log(`Retrying job ${jobId} (attempt ${jobData.attempts}/${jobData.maxAttempts})`);
        
        // Schedule retry (simulated)
        setTimeout(() => this.processJob(jobId), this.calculateRetryDelay(jobData.attempts));
      } else {
        console.log(`Job ${jobId} completed with ${result.success ? 'success' : 'failure'}`);
      }
    } catch (error) {
      console.error(`Error processing job ${jobId}:`, error);
      
      // Store error result
      this.results.set(jobId, {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Retry if needed
      if (jobData.attempts < jobData.maxAttempts) {
        console.log(`Retrying job ${jobId} after error (attempt ${jobData.attempts}/${jobData.maxAttempts})`);
        
        // Schedule retry (simulated)
        setTimeout(() => this.processJob(jobId), this.calculateRetryDelay(jobData.attempts));
      }
    }
  }
  
  /**
   * Calculate the retry delay based on the retry strategy
   * 
   * @param attempts Number of attempts so far
   * @returns Delay in milliseconds
   */
  private calculateRetryDelay(attempts: number): number {
    const { strategy, baseDelay } = this.retryConfig;
    
    switch (strategy) {
      case RetryStrategy.LINEAR:
        return baseDelay * attempts;
      case RetryStrategy.EXPONENTIAL:
        return baseDelay * Math.pow(2, attempts - 1);
      case RetryStrategy.FIXED:
      default:
        return baseDelay;
    }
  }
  
  /**
   * Get the status of a job
   * 
   * @param jobId Job ID to check
   * @returns Job status or null if not found
   */
  async getJobStatus(jobId: string): Promise<any> {
    console.log(`Checking mock job status: ${jobId}`);
    
    const jobData = this.jobs.get(jobId);
    const result = this.results.get(jobId);
    
    if (!jobData) {
      return null;
    }
    
    return {
      id: jobId,
      status: result ? (result.success ? 'completed' : 'failed') : 'processing',
      attempts: jobData.attempts,
      maxAttempts: jobData.maxAttempts,
      protocol: jobData.protocol,
      result
    };
  }
  
  /**
   * Close the queue
   */
  async close(): Promise<void> {
    console.log('Closing mock queue');
    // No actual resources to clean up in the mock implementation
  }
}