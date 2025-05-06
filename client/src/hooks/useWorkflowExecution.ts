import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ExecutionStatus } from '@shared/schema';

type WorkflowExecutionState = {
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  status: ExecutionStatus;
  progress: number;
  currentNodes: string[];
  completedNodes: string[];
  nodeResults: Record<string, any>;
  isActive: boolean;
  recentLogs: string[];
};

type WorkflowExecutionControls = {
  pauseExecution: () => Promise<void>;
  resumeExecution: () => Promise<void>;
  cancelExecution: () => Promise<void>;
};

/**
 * Custom hook for managing workflow execution state and controls
 * 
 * @param executionId The ID of the workflow execution
 * @returns A tuple containing [executionState, executionControls]
 */
export function useWorkflowExecution(
  executionId: number
): [WorkflowExecutionState, WorkflowExecutionControls] {
  const queryClient = useQueryClient();
  
  // Initialize state
  const [state, setState] = useState<WorkflowExecutionState>({
    isLoading: true,
    isError: false,
    errorMessage: null,
    status: ExecutionStatus.QUEUED,
    progress: 0,
    currentNodes: [],
    completedNodes: [],
    nodeResults: {},
    isActive: false,
    recentLogs: []
  });

  // Fetch execution details
  const { data, error, isLoading } = useQuery({
    queryKey: ['/api/executions', executionId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/executions/${executionId}`);
      return response.json();
    },
    refetchInterval: 
      state.status === ExecutionStatus.RUNNING ||
      state.status === ExecutionStatus.QUEUED 
        ? 5000 
        : false,
  });

  // Update state when data changes
  useEffect(() => {
    if (data) {
      const executionData = data.execution;
      const nodeExecutions = data.nodeExecutions || [];
      
      // Calculate progress
      const totalNodes = nodeExecutions.length || 1;
      const completedNodesCount = nodeExecutions.filter(
        (node: any) => node.status === ExecutionStatus.COMPLETED
      ).length;
      const progress = Math.floor((completedNodesCount / totalNodes) * 100);
      
      // Extract node IDs
      const currentNodeIds = nodeExecutions
        .filter((node: any) => node.status === ExecutionStatus.RUNNING)
        .map((node: any) => node.nodeId);
      
      const completedNodeIds = nodeExecutions
        .filter((node: any) => node.status === ExecutionStatus.COMPLETED)
        .map((node: any) => node.nodeId);
      
      // Build node results map
      const nodeResults: Record<string, any> = {};
      nodeExecutions.forEach((node: any) => {
        nodeResults[node.nodeId] = {
          status: node.status,
          startTime: node.startedAt,
          endTime: node.completedAt,
          input: node.input,
          output: node.output,
          error: node.error,
        };
      });
      
      // Update state
      setState({
        isLoading: false,
        isError: false,
        errorMessage: null,
        status: executionData.status,
        progress,
        currentNodes: currentNodeIds,
        completedNodes: completedNodeIds,
        nodeResults,
        isActive: 
          executionData.status === ExecutionStatus.RUNNING ||
          executionData.status === ExecutionStatus.QUEUED,
        recentLogs: state.recentLogs,
      });
    }
  }, [data]);

  // Handle errors
  useEffect(() => {
    if (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [error]);

  // Update loading state
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading
    }));
  }, [isLoading]);

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    if (!executionId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log(`WebSocket connection established for execution ${executionId}`);
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Only process events for this execution
        if (message.data?.executionId !== executionId) return;
        
        // Handle different event types
        switch (message.type) {
          case 'execution_started':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.RUNNING,
              isActive: true,
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'execution_completed':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.COMPLETED,
              progress: 100,
              isActive: false,
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'execution_failed':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.FAILED,
              isActive: false,
              errorMessage: message.data.error || 'Execution failed',
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'execution_paused':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.PAUSED,
              isActive: false,
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'execution_resumed':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.RUNNING,
              isActive: true,
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'execution_cancelled':
            setState(prev => ({
              ...prev,
              status: ExecutionStatus.CANCELLED,
              isActive: false,
            }));
            queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            break;
            
          case 'node_execution_update':
            const nodeEvent = message.data;
            setState(prev => {
              // Update node results
              const updatedNodeResults = {
                ...prev.nodeResults,
                [nodeEvent.nodeId]: {
                  status: nodeEvent.status,
                  startTime: nodeEvent.timestamp,
                  endTime: nodeEvent.completedAt,
                  input: nodeEvent.input,
                  output: nodeEvent.output,
                  error: nodeEvent.error,
                },
              };
              
              // Update current and completed nodes
              let updatedCurrentNodes = [...prev.currentNodes];
              let updatedCompletedNodes = [...prev.completedNodes];
              
              if (nodeEvent.status === ExecutionStatus.RUNNING) {
                if (!updatedCurrentNodes.includes(nodeEvent.nodeId)) {
                  updatedCurrentNodes.push(nodeEvent.nodeId);
                }
                updatedCompletedNodes = updatedCompletedNodes.filter(id => id !== nodeEvent.nodeId);
              } else if (nodeEvent.status === ExecutionStatus.COMPLETED) {
                if (!updatedCompletedNodes.includes(nodeEvent.nodeId)) {
                  updatedCompletedNodes.push(nodeEvent.nodeId);
                }
                updatedCurrentNodes = updatedCurrentNodes.filter(id => id !== nodeEvent.nodeId);
              }
              
              // Calculate new progress
              const totalNodes = Object.keys(updatedNodeResults).length || 1;
              const completedNodesCount = updatedCompletedNodes.length;
              const progress = Math.floor((completedNodesCount / totalNodes) * 100);
              
              return {
                ...prev,
                nodeResults: updatedNodeResults,
                currentNodes: updatedCurrentNodes,
                completedNodes: updatedCompletedNodes,
                progress,
              };
            });
            break;
            
          case 'log':
            setState(prev => {
              // Add log to recent logs, keeping only the most recent 50
              const newRecentLogs = [...prev.recentLogs, message.data.message || ''];
              if (newRecentLogs.length > 50) {
                newRecentLogs.shift(); // Remove oldest log
              }
              
              return {
                ...prev,
                recentLogs: newRecentLogs,
              };
            });
            break;
            
          default:
            // For other event types, just invalidate the query to fetch fresh data
            if (message.type.includes('execution') || message.type.includes('node')) {
              queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
            }
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Clean up WebSocket connection on component unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [executionId, queryClient]);

  // Define control functions
  const pauseExecution = useCallback(async () => {
    try {
      await apiRequest('POST', `/api/executions/${executionId}/pause`);
      setState(prev => ({
        ...prev,
        status: ExecutionStatus.PAUSED,
        isActive: false,
      }));
      queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
    } catch (error) {
      console.error('Error pausing execution:', error);
      throw error;
    }
  }, [executionId, queryClient]);

  const resumeExecution = useCallback(async () => {
    try {
      await apiRequest('POST', `/api/executions/${executionId}/resume`);
      setState(prev => ({
        ...prev,
        status: ExecutionStatus.RUNNING,
        isActive: true,
      }));
      queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
    } catch (error) {
      console.error('Error resuming execution:', error);
      throw error;
    }
  }, [executionId, queryClient]);

  const cancelExecution = useCallback(async () => {
    try {
      await apiRequest('POST', `/api/executions/${executionId}/cancel`);
      setState(prev => ({
        ...prev,
        status: ExecutionStatus.CANCELLED,
        isActive: false,
      }));
      queryClient.invalidateQueries({queryKey: ['/api/executions', executionId]});
    } catch (error) {
      console.error('Error cancelling execution:', error);
      throw error;
    }
  }, [executionId, queryClient]);

  // Return state and controls
  return [
    state,
    { 
      pauseExecution,
      resumeExecution,
      cancelExecution
    }
  ];
}