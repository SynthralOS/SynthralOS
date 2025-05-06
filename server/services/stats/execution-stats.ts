/**
 * Execution Statistics Service
 * 
 * Service for tracking and reporting workflow execution statistics
 */

interface ExecutionStats {
  totalExecutions: number;
  activeExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  averageDuration: number; // in milliseconds
  successRate: number; // 0-100 percentage
}

class ExecutionStatsService {
  private stats: ExecutionStats = {
    totalExecutions: 0,
    activeExecutions: 0,
    completedExecutions: 0,
    failedExecutions: 0,
    averageDuration: 0,
    successRate: 0
  };
  
  private durations: number[] = [];
  
  constructor() {
    // Initialize with some reasonable values for demonstration
    this.stats = {
      totalExecutions: 142,
      activeExecutions: 3,
      completedExecutions: 122,
      failedExecutions: 17,
      averageDuration: 45000, // 45 seconds
      successRate: 87.5 // percentage
    };
  }
  
  /**
   * Get current execution statistics
   */
  public getStats(): ExecutionStats {
    return { ...this.stats };
  }
  
  /**
   * Record a new execution start
   */
  public recordExecutionStart(): void {
    this.stats.totalExecutions++;
    this.stats.activeExecutions++;
  }
  
  /**
   * Record an execution completion
   */
  public recordExecutionCompletion(
    durationMs: number, 
    success: boolean = true
  ): void {
    this.stats.activeExecutions = Math.max(0, this.stats.activeExecutions - 1);
    
    if (success) {
      this.stats.completedExecutions++;
    } else {
      this.stats.failedExecutions++;
    }
    
    // Update average duration
    this.durations.push(durationMs);
    if (this.durations.length > 100) {
      this.durations.shift(); // Keep last 100 durations
    }
    
    this.stats.averageDuration = this.durations.reduce((sum, d) => sum + d, 0) / this.durations.length;
    
    // Update success rate
    const total = this.stats.completedExecutions + this.stats.failedExecutions;
    this.stats.successRate = total > 0 
      ? (this.stats.completedExecutions / total) * 100 
      : 0;
  }
  
  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      activeExecutions: 0,
      completedExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
      successRate: 0
    };
    this.durations = [];
  }
}

// Export singleton instance
export const executionStats = new ExecutionStatsService();