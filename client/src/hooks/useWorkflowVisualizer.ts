import { useState, useEffect, useCallback } from 'react';
import { ExecutionStatus } from '@/lib/workflow';
import { Edge, Node, useReactFlow } from 'reactflow';

export interface FlowVisualizationOptions {
  animateDataFlow?: boolean;
  animateNodeStatus?: boolean; 
  showDataTransfers?: boolean;
  animationSpeed?: number; // 1-10
  highlightActivePath?: boolean;
}

export interface NodeExecution {
  nodeId: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

interface EdgeTransfer {
  sourceNodeId: string;
  targetNodeId: string;
  edgeId: string;
  data?: any;
  active: boolean;
}

export function useWorkflowVisualizer(
  initialNodes: Node[] = [],
  initialEdges: Edge[] = [],
  options: FlowVisualizationOptions = {}
) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const [nodeExecutions, setNodeExecutions] = useState<Record<string, NodeExecution>>({});
  const [edgeTransfers, setEdgeTransfers] = useState<Record<string, EdgeTransfer>>({});
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>(ExecutionStatus.PENDING);
  
  // Initialize with provided options
  const {
    animateDataFlow = true,
    animateNodeStatus = true,
    showDataTransfers = true,
    animationSpeed = 5, // Medium speed by default (1-10)
    highlightActivePath = true
  } = options;
  
  // Update node status in the visualization
  const updateNodeStatus = useCallback((nodeId: string, status: NodeExecution['status'], message?: string) => {
    setNodeExecutions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        nodeId,
        status,
        ...(message && { message })
      }
    }));
    
    // Update the actual node in the flow
    setNodes(nodes => 
      nodes.map(node => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              status,
              message: message || node.data.message
            }
          };
        }
        return node;
      })
    );
  }, [setNodes]);
  
  // Start a node execution animation
  const startNodeExecution = useCallback((nodeId: string, message?: string) => {
    updateNodeStatus(nodeId, 'running', message);
    
    // Also update timestamp
    setNodeExecutions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        startedAt: new Date().toISOString(),
        completedAt: undefined,
        error: undefined
      }
    }));
  }, [updateNodeStatus]);
  
  // Complete a node execution animation
  const completeNodeExecution = useCallback((nodeId: string, message?: string) => {
    updateNodeStatus(nodeId, 'completed', message);
    
    // Also update timestamp
    setNodeExecutions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        completedAt: new Date().toISOString(),
        error: undefined
      }
    }));
  }, [updateNodeStatus]);
  
  // Mark a node execution as failed
  const failNodeExecution = useCallback((nodeId: string, error?: string) => {
    updateNodeStatus(nodeId, 'failed', error);
    
    // Also update timestamp and error
    setNodeExecutions(prev => ({
      ...prev,
      [nodeId]: {
        ...prev[nodeId],
        completedAt: new Date().toISOString(),
        error
      }
    }));
  }, [updateNodeStatus]);
  
  // Pause a node execution animation
  const pauseNodeExecution = useCallback((nodeId: string) => {
    updateNodeStatus(nodeId, 'paused');
  }, [updateNodeStatus]);
  
  // Reset all node status to idle
  const resetAllNodeStatus = useCallback(() => {
    const nodes = getNodes();
    
    // Update all nodes to idle
    setNodes(nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: 'idle',
        message: undefined
      }
    })));
    
    // Reset nodeExecutions state
    setNodeExecutions({});
    
    // Reset edge transfers
    setEdgeTransfers({});
    
    // Reset edge animations
    setEdges(getEdges().map(edge => ({
      ...edge,
      data: {
        ...edge.data,
        animated: false,
        pulse: false,
        status: 'default'
      }
    })));
  }, [getNodes, getEdges, setNodes, setEdges]);
  
  // Start a data transfer animation between nodes
  const startDataTransfer = useCallback((sourceNodeId: string, targetNodeId: string, data?: any) => {
    // Find the edge between these nodes
    const edges = getEdges();
    const edge = edges.find(e => e.source === sourceNodeId && e.target === targetNodeId);
    
    if (edge) {
      // Create a transfer record
      setEdgeTransfers(prev => ({
        ...prev,
        [edge.id]: {
          sourceNodeId,
          targetNodeId,
          edgeId: edge.id,
          data,
          active: true
        }
      }));
      
      // Update the edge to show animation
      setEdges(edges.map(e => {
        if (e.id === edge.id) {
          return {
            ...e,
            animated: animateDataFlow,
            data: {
              ...e.data,
              pulse: showDataTransfers,
              speed: animationSpeed,
              status: 'active'
            }
          };
        }
        return e;
      }));
    }
  }, [getEdges, setEdges, animateDataFlow, showDataTransfers, animationSpeed]);
  
  // Complete a data transfer animation
  const completeDataTransfer = useCallback((sourceNodeId: string, targetNodeId: string) => {
    // Find the edge between these nodes
    const edges = getEdges();
    const edge = edges.find(e => e.source === sourceNodeId && e.target === targetNodeId);
    
    if (edge) {
      // Update the transfer record
      setEdgeTransfers(prev => ({
        ...prev,
        [edge.id]: {
          ...prev[edge.id],
          active: false
        }
      }));
      
      // Update the edge animation
      setEdges(edges.map(e => {
        if (e.id === edge.id) {
          return {
            ...e,
            animated: false,
            data: {
              ...e.data,
              pulse: false,
              status: 'completed'
            }
          };
        }
        return e;
      }));
    }
  }, [getEdges, setEdges]);
  
  // Handle a failed data transfer
  const failDataTransfer = useCallback((sourceNodeId: string, targetNodeId: string) => {
    // Find the edge between these nodes
    const edges = getEdges();
    const edge = edges.find(e => e.source === sourceNodeId && e.target === targetNodeId);
    
    if (edge) {
      // Update the transfer record
      setEdgeTransfers(prev => ({
        ...prev,
        [edge.id]: {
          ...prev[edge.id],
          active: false
        }
      }));
      
      // Update the edge to show error
      setEdges(edges.map(e => {
        if (e.id === edge.id) {
          return {
            ...e,
            animated: false,
            data: {
              ...e.data,
              pulse: false,
              status: 'error'
            }
          };
        }
        return e;
      }));
    }
  }, [getEdges, setEdges]);
  
  // Handle WebSocket message for node status updates
  const handleNodeExecutionUpdate = useCallback((event: any) => {
    const { nodeId, status, error, message } = event.data;
    
    switch (status) {
      case 'pending':
        // Node is about to start
        updateNodeStatus(nodeId, 'idle');
        break;
        
      case 'running':
        // Node is running
        startNodeExecution(nodeId, message);
        break;
        
      case 'completed':
        // Node has completed
        completeNodeExecution(nodeId, message);
        break;
        
      case 'failed':
        // Node has failed
        failNodeExecution(nodeId, error || message);
        break;
        
      case 'paused':
        // Node is paused
        pauseNodeExecution(nodeId);
        break;
    }
  }, [updateNodeStatus, startNodeExecution, completeNodeExecution, failNodeExecution, pauseNodeExecution]);
  
  // Handle WebSocket message for data routing updates
  const handleRoutingUpdate = useCallback((event: any) => {
    const { sourceNodeId, targetNodeId, status, data } = event.data;
    
    if (status === 'started') {
      startDataTransfer(sourceNodeId, targetNodeId, data);
    } else if (status === 'completed') {
      completeDataTransfer(sourceNodeId, targetNodeId);
    } else if (status === 'failed') {
      failDataTransfer(sourceNodeId, targetNodeId);
    }
  }, [startDataTransfer, completeDataTransfer, failDataTransfer]);
  
  // Handle overall execution status updates
  const handleExecutionUpdate = useCallback((status: ExecutionStatus) => {
    setExecutionStatus(status);
    
    // If execution is reset or completed, reset visualization
    if (status === ExecutionStatus.PENDING) {
      resetAllNodeStatus();
    }
  }, [resetAllNodeStatus]);

  // Provide an API for external control
  return {
    // Core state
    nodeExecutions,
    edgeTransfers,
    executionStatus,
    
    // Node status control
    updateNodeStatus,
    startNodeExecution,
    completeNodeExecution,
    failNodeExecution,
    pauseNodeExecution,
    resetAllNodeStatus,
    
    // Edge transfer control
    startDataTransfer,
    completeDataTransfer,
    failDataTransfer,
    
    // WebSocket event handlers
    handleNodeExecutionUpdate,
    handleRoutingUpdate,
    handleExecutionUpdate
  };
}