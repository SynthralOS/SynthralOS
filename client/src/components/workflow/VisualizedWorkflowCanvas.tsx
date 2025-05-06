import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Connection,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  ReactFlowInstance,
  Edge as ReactFlowEdge,
  Node as ReactFlowNode,
  getConnectedEdges
} from 'reactflow';
import 'reactflow/dist/style.css';
import { createNode, createEdge, isValidConnection, Node, Edge, ExecutionStatus } from '@/lib/workflow';
import { Position, NodeType } from '@/lib/node-types';
import NodePanel from './NodePanel';
import PropertiesPanel from './PropertiesPanel';
import AnimatedNode from './AnimatedNode';
import AnimatedEdge from './AnimatedEdge';
import { Button } from '@/components/ui/button';
import { 
  ArrowDown, 
  ArrowUp, 
  Trash2, 
  Save, 
  Play,
  Pause,
  StopCircle,
  Plus,
  FastForward 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useWorkflowVisualizer } from '@/hooks/useWorkflowVisualizer';
import { apiRequest } from '@/lib/queryClient';

interface VisualizedWorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  workflowId?: number;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

// Custom node types
const nodeTypes = {
  // Default type uses AnimatedNode for all node types
  default: AnimatedNode,
};

// Custom edge types
const edgeTypes = {
  // Default type uses AnimatedEdge for all edge types
  default: AnimatedEdge,
};

const VisualizedWorkflowCanvas: React.FC<VisualizedWorkflowCanvasProps> = ({
  initialNodes = [],
  initialEdges = [],
  workflowId,
  onSave,
  readOnly = false,
}) => {
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [executionId, setExecutionId] = useState<number | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();
  
  // Initialize our workflow visualizer hook
  const visualizer = useWorkflowVisualizer(initialNodes, initialEdges, {
    animateDataFlow: true,
    animateNodeStatus: true,
    showDataTransfers: true,
    animationSpeed: 5,
    highlightActivePath: true
  });

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      
      // Update selected node if it changed
      const selectChange = changes.find(
        (change) => change.type === 'select' && change.selected === true
      ) as any; // Cast to any to handle the id property
      
      if (selectChange?.id) {
        const node = nodes.find((n) => n.id === selectChange.id);
        setSelectedNode(node || null);
        setSelectedEdge(null);
      } else if (changes.some((change) => change.type === 'select' && change.selected === false)) {
        // If a node was deselected and no other node is selected, clear the selection
        if (!changes.some((change) => change.type === 'select' && change.selected === true)) {
          setSelectedNode(null);
        }
      }
    },
    [nodes]
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      
      // Update selected edge if it changed
      const selectChange = changes.find(
        (change) => change.type === 'select' && change.selected === true
      ) as any;
      
      if (selectChange?.id) {
        const edge = edges.find((e) => e.id === selectChange.id);
        setSelectedEdge(edge || null);
        setSelectedNode(null);
      } else if (changes.some((change) => change.type === 'select' && change.selected === false)) {
        if (!changes.some((change) => change.type === 'select' && change.selected === true)) {
          setSelectedEdge(null);
        }
      }
    },
    [edges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      
      if (sourceNode && targetNode && connection.source && connection.target) {
        if (isValidConnection(sourceNode, targetNode, connection.sourceHandle || undefined, connection.targetHandle || undefined)) {
          const newEdge = createEdge(
            connection.source,
            connection.target,
            connection.sourceHandle || undefined,
            connection.targetHandle || undefined
          );
          
          setEdges((eds) => addEdge({
            ...newEdge,
            type: 'default', // Use animated edge
            data: {
              status: 'default'
            }
          }, eds));
        }
      }
    },
    [nodes]
  );

  // Add a new node to the canvas
  const onAddNode = useCallback(
    (type: NodeType, position: Position) => {
      const newNode = createNode(type, position);
      
      // Add status property to the node data
      const nodeWithStatus = {
        ...newNode,
        type: 'default', // Use animated node
        data: {
          ...newNode.data,
          status: 'idle' // Start with idle status
        }
      };
      
      setNodes((nds) => [...nds, nodeWithStatus]);
      return nodeWithStatus;
    },
    []
  );

  // Handle node drop from panel
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      if (reactFlowWrapper.current && reactFlowInstance) {
        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
        const type = event.dataTransfer.getData('application/reactflow/type') as NodeType;
        
        if (type) {
          const position = reactFlowInstance.project({
            x: event.clientX - reactFlowBounds.left,
            y: event.clientY - reactFlowBounds.top,
          });
          
          onAddNode(type, position);
        }
      }
    },
    [reactFlowInstance, onAddNode]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node data update
  const onNodeDataUpdate = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            };
          }
          return node;
        })
      );
    },
    []
  );

  // Delete selected nodes or edges
  const onDelete = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) =>
        eds.filter(
          (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id
        )
      );
      setSelectedNode(null);
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNode, selectedEdge]);

  // Save the workflow
  const handleSave = useCallback(() => {
    if (onSave) {
      // Remove visualization-specific properties before saving
      const cleanNodes = nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: undefined,
          progress: undefined,
          message: undefined,
        }
      }));
      
      const cleanEdges = edges.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          animated: undefined,
          pulse: undefined,
          status: undefined,
        }
      }));
      
      onSave(cleanNodes, cleanEdges);
    }
  }, [nodes, edges, onSave]);

  // Clear the workflow
  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the workflow? This cannot be undone.')) {
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
      visualizer.resetAllNodeStatus();
    }
  }, [visualizer]);

  // Execute the workflow
  const executeWorkflow = useCallback(async () => {
    if (!workflowId) {
      toast({
        title: 'Error',
        description: 'Please save the workflow before executing it.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Reset visualization state
      visualizer.resetAllNodeStatus();
      
      // Call the API to start the workflow execution
      const response = await apiRequest('POST', `/api/workflows/${workflowId}/execute`);
      const result = await response.json();
      
      setExecutionId(result.id);
      visualizer.handleExecutionUpdate(ExecutionStatus.RUNNING);
      
      toast({
        title: 'Workflow Execution Started',
        description: `Execution ID: ${result.id}`,
      });
      
      // Initialize WebSocket connection if not already established
      setupWebSocketConnection();
      
    } catch (error) {
      console.error('Error executing workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to start workflow execution',
        variant: 'destructive'
      });
    }
  }, [workflowId, visualizer, toast]);

  // Pause the workflow execution
  const pauseExecution = useCallback(async () => {
    if (!executionId) return;
    
    try {
      await apiRequest('POST', `/api/executions/${executionId}/pause`);
      visualizer.handleExecutionUpdate(ExecutionStatus.PAUSED);
      
      toast({
        title: 'Workflow Execution Paused',
        description: 'You can resume the execution when ready',
      });
    } catch (error) {
      console.error('Error pausing workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to pause execution',
        variant: 'destructive'
      });
    }
  }, [executionId, visualizer, toast]);

  // Resume the workflow execution
  const resumeExecution = useCallback(async () => {
    if (!executionId) return;
    
    try {
      await apiRequest('POST', `/api/executions/${executionId}/resume`);
      visualizer.handleExecutionUpdate(ExecutionStatus.RUNNING);
      
      toast({
        title: 'Workflow Execution Resumed',
        description: 'Execution has been resumed',
      });
    } catch (error) {
      console.error('Error resuming workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to resume execution',
        variant: 'destructive'
      });
    }
  }, [executionId, visualizer, toast]);

  // Cancel the workflow execution
  const cancelExecution = useCallback(async () => {
    if (!executionId) return;
    
    try {
      await apiRequest('POST', `/api/executions/${executionId}/cancel`);
      visualizer.handleExecutionUpdate(ExecutionStatus.CANCELLED);
      
      toast({
        title: 'Workflow Execution Cancelled',
        description: 'The execution has been cancelled',
      });
    } catch (error) {
      console.error('Error cancelling workflow:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel execution',
        variant: 'destructive'
      });
    }
  }, [executionId, visualizer, toast]);

  // Set up WebSocket connection for real-time updates
  const setupWebSocketConnection = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    // Set up WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connection established');
      
      // Subscribe to execution updates if executionId exists
      if (executionId) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          topic: `execution.${executionId}`
        }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'node_execution_update') {
          visualizer.handleNodeExecutionUpdate(message);
        } else if (message.type === 'routing_update') {
          visualizer.handleRoutingUpdate(message);
        } else if (message.type === 'execution_started') {
          visualizer.handleExecutionUpdate(ExecutionStatus.RUNNING);
        } else if (message.type === 'execution_completed') {
          visualizer.handleExecutionUpdate(ExecutionStatus.COMPLETED);
        } else if (message.type === 'execution_failed') {
          visualizer.handleExecutionUpdate(ExecutionStatus.FAILED);
        } else if (message.type === 'execution_paused') {
          visualizer.handleExecutionUpdate(ExecutionStatus.PAUSED);
        } else if (message.type === 'execution_resumed') {
          visualizer.handleExecutionUpdate(ExecutionStatus.RUNNING);
        } else if (message.type === 'execution_cancelled') {
          visualizer.handleExecutionUpdate(ExecutionStatus.CANCELLED);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    
    // Clean up function
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [executionId, visualizer]);

  // Set up WebSocket on component mount
  useEffect(() => {
    const cleanup = setupWebSocketConnection();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [setupWebSocketConnection]);
  
  // Handle workflow execution controls based on status
  const renderExecutionControls = () => {
    const status = visualizer.executionStatus;
    
    if (status === ExecutionStatus.RUNNING) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm"
            onClick={pauseExecution}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={cancelExecution}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </>
      );
    } else if (status === ExecutionStatus.PAUSED) {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm"
            onClick={resumeExecution}
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={cancelExecution}
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </>
      );
    } else {
      return (
        <Button 
          variant="default" 
          size="sm"
          onClick={executeWorkflow}
          disabled={readOnly || status === ExecutionStatus.RUNNING}
        >
          <Play className="mr-2 h-4 w-4" />
          Run Workflow
        </Button>
      );
    }
  };

  return (
    <div className="w-full h-full flex">
      <NodePanel />
      
      <div className="flex-1 h-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid={true}
          snapGrid={[20, 20]}
          defaultEdgeOptions={{
            type: 'default',
            data: {
              status: 'default'
            }
          }}
          fitView
          attributionPosition="bottom-right"
        >
          <Background color="#aaa" gap={16} />
          <Controls />
          
          <Panel position="top-right" className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleSave}
              disabled={readOnly}
            >
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClear}
              disabled={readOnly}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onDelete}
              disabled={!selectedNode && !selectedEdge || readOnly}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
            
            {/* Dynamic execution controls */}
            {renderExecutionControls()}
          </Panel>
        </ReactFlow>
      </div>
      
      <PropertiesPanel
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onNodeDataUpdate={onNodeDataUpdate}
        readOnly={readOnly}
      />
    </div>
  );
};

// Wrap with ReactFlowProvider for use in other components
const VisualizedWorkflowCanvasWithProvider: React.FC<VisualizedWorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <VisualizedWorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default VisualizedWorkflowCanvasWithProvider;