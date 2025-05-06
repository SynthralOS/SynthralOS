/**
 * Performance Monitor Service
 * 
 * Service for monitoring and reporting on workflow performance metrics
 * including memory usage, CPU usage, response time, and other performance indicators
 */

import { logInfo, logError } from '../activity-logger';
import { EntityType } from '@shared/schema';
import { EventEmitter } from 'events';

export interface PerformanceThresholds {
  warning?: number;
  critical?: number;
}

export interface PerformanceMetrics {
  memoryUsage: number;        // in MB
  cpuUsage: number;           // percentage (0-100)
  responseTime: number;       // in ms
  throughput: number;         // requests per minute
  errorRate: number;          // percentage (0-100)
  queueLength: number;        // number of queued jobs/tasks
  activeConnections: number;  // number of active connections/sessions
  diskUsage: number;          // percentage (0-100)
}

export interface WorkflowPerformanceData {
  workflowId: string;
  metrics: PerformanceMetrics;
  timestamp: Date;
}

export interface PerformanceAlert {
  workflowId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
}

class PerformanceMonitorService extends EventEmitter {
  private performanceData: Map<string, WorkflowPerformanceData[]> = new Map();
  private thresholds: Map<string, Record<string, PerformanceThresholds>> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private samplingIntervalMs: number = 60000; // Default: 1 minute
  
  constructor() {
    super();
    
    // Sample metrics for demo purposes 
    // In a real implementation, these would come from actual system monitoring
    const demoMetrics: PerformanceMetrics = {
      memoryUsage: 256,
      cpuUsage: 15,
      responseTime: 120,
      throughput: 42,
      errorRate: 1.5,
      queueLength: 3,
      activeConnections: 8,
      diskUsage: 45
    };
    
    // Demo data for a few workflows
    this.recordMetrics('workflow-1', { ...demoMetrics, cpuUsage: 22, memoryUsage: 310 });
    this.recordMetrics('workflow-2', { ...demoMetrics, responseTime: 350, throughput: 15 });
    this.recordMetrics('workflow-3', { ...demoMetrics, errorRate: 0.2, diskUsage: 65 });
  }
  
  /**
   * Set default thresholds for a workflow
   */
  public setThresholds(workflowId: string, metricThresholds: Record<string, PerformanceThresholds>): void {
    this.thresholds.set(workflowId, metricThresholds);
    logInfo(
      "Set performance thresholds", 
      { message: "Setting performance thresholds for workflow", workflow: workflowId },
      undefined,
      EntityType.Workflow,
      workflowId
    );
  }
  
  /**
   * Get current thresholds for a workflow
   */
  public getThresholds(workflowId: string): Record<string, PerformanceThresholds> {
    return this.thresholds.get(workflowId) || {};
  }
  
  /**
   * Record performance metrics for a workflow
   */
  public recordMetrics(workflowId: string, metrics: PerformanceMetrics): void {
    const timestamp = new Date();
    const data: WorkflowPerformanceData = {
      workflowId,
      metrics,
      timestamp
    };
    
    // Initialize history array if needed
    if (!this.performanceData.has(workflowId)) {
      this.performanceData.set(workflowId, []);
    }
    
    // Add new metrics to history
    const history = this.performanceData.get(workflowId)!;
    history.push(data);
    
    // Limit history size (keep last 1000 data points)
    if (history.length > 1000) {
      history.shift();
    }
    
    // Check for threshold violations
    this.checkThresholds(workflowId, metrics);
  }
  
  /**
   * Get performance metrics for a workflow
   */
  public getMetrics(workflowId: string): WorkflowPerformanceData[] {
    return this.performanceData.get(workflowId) || [];
  }
  
  /**
   * Get the latest performance metrics for a workflow
   */
  public getLatestMetrics(workflowId: string): WorkflowPerformanceData | null {
    const metrics = this.performanceData.get(workflowId);
    if (!metrics || metrics.length === 0) {
      return null;
    }
    return metrics[metrics.length - 1];
  }
  
  /**
   * Get a list of all monitored workflow IDs
   */
  public getMonitoredWorkflows(): string[] {
    return Array.from(this.performanceData.keys());
  }
  
  /**
   * Clear performance data for a workflow
   */
  public clearMetrics(workflowId: string): void {
    this.performanceData.delete(workflowId);
  }
  
  /**
   * Start continuous monitoring
   */
  public startMonitoring(intervalMs: number = 60000): void {
    if (this.isMonitoring) {
      return;
    }
    
    this.samplingIntervalMs = intervalMs;
    this.isMonitoring = true;
    
    // In a real implementation, this would sample actual system metrics
    this.monitoringInterval = setInterval(() => {
      for (const workflowId of this.getMonitoredWorkflows()) {
        const lastMetrics = this.getLatestMetrics(workflowId);
        if (lastMetrics) {
          // Simulate some variation in metrics
          const variationFactor = 0.1; // 10% variation
          const newMetrics: PerformanceMetrics = {
            memoryUsage: this.applyRandomVariation(lastMetrics.metrics.memoryUsage, variationFactor),
            cpuUsage: this.applyRandomVariation(lastMetrics.metrics.cpuUsage, variationFactor),
            responseTime: this.applyRandomVariation(lastMetrics.metrics.responseTime, variationFactor),
            throughput: this.applyRandomVariation(lastMetrics.metrics.throughput, variationFactor),
            errorRate: this.applyRandomVariation(lastMetrics.metrics.errorRate, variationFactor),
            queueLength: Math.max(0, Math.round(this.applyRandomVariation(lastMetrics.metrics.queueLength, variationFactor))),
            activeConnections: Math.max(0, Math.round(this.applyRandomVariation(lastMetrics.metrics.activeConnections, variationFactor))),
            diskUsage: this.applyRandomVariation(lastMetrics.metrics.diskUsage, variationFactor),
          };
          
          this.recordMetrics(workflowId, newMetrics);
        }
      }
    }, this.samplingIntervalMs);
    
    logInfo(
      "Started performance monitoring", 
      { message: `Performance monitoring started with interval of ${intervalMs}ms` },
      undefined,
      EntityType.System
    );
  }
  
  /**
   * Stop continuous monitoring
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring || !this.monitoringInterval) {
      return;
    }
    
    clearInterval(this.monitoringInterval);
    this.isMonitoring = false;
    this.monitoringInterval = null;
    
    logInfo(
      "Stopped performance monitoring", 
      { message: "Performance monitoring was stopped" },
      undefined,
      EntityType.System
    );
  }
  
  /**
   * Apply random variation to a metric value
   */
  private applyRandomVariation(value: number, factor: number): number {
    const variation = (Math.random() * 2 - 1) * factor * value;
    return Math.max(0, value + variation);
  }
  
  /**
   * Check if any metrics have crossed thresholds and emit alerts
   */
  private checkThresholds(workflowId: string, metrics: PerformanceMetrics): void {
    const thresholds = this.thresholds.get(workflowId);
    if (!thresholds) {
      return;
    }
    
    for (const [metricName, metricValue] of Object.entries(metrics)) {
      const threshold = thresholds[metricName];
      if (!threshold) {
        continue;
      }
      
      if (threshold.critical !== undefined && metricValue >= threshold.critical) {
        const alert: PerformanceAlert = {
          workflowId,
          metric: metricName,
          value: metricValue,
          threshold: threshold.critical,
          severity: 'critical',
          timestamp: new Date()
        };
        
        this.emit('alert', alert);
        // Create an error object to log
        const alertError = new Error(`Workflow ${workflowId} has ${metricName} at ${metricValue} (threshold: ${threshold.critical})`);
        
        // Add custom properties to the error
        Object.assign(alertError, {
          workflowId,
          metric: metricName,
          value: metricValue,
          threshold: threshold.critical
        });
        
        logError(
          `Performance alert: ${metricName} exceeded critical threshold`, 
          alertError,
          undefined,
          EntityType.Workflow,
          workflowId
        );
      } 
      else if (threshold.warning !== undefined && metricValue >= threshold.warning) {
        const alert: PerformanceAlert = {
          workflowId,
          metric: metricName,
          value: metricValue,
          threshold: threshold.warning,
          severity: 'warning',
          timestamp: new Date()
        };
        
        this.emit('alert', alert);
        logInfo(
          `Performance warning: ${metricName} exceeded warning threshold`,
          { 
            message: `Workflow ${workflowId} has ${metricName} at ${metricValue} (threshold: ${threshold.warning})`,
            workflowId: workflowId,
            metric: metricName,
            value: metricValue,
            threshold: threshold.warning
          },
          undefined,
          EntityType.Workflow,
          workflowId
        );
      }
    }
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitorService();