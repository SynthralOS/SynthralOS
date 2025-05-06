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
  BackgroundVariant,
  Node as ReactFlowNode,
  useKeyPress,
  useOnSelectionChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { createNode, createEdge, isValidConnection } from '@/lib/workflow';
import { NodePosition } from '@shared/schema';
import { Node, Edge } from '@/lib/workflow';
import { Position, NodeType } from '@/lib/node-types';
import NodePanel from './NodePanel';
import PropertiesPanel from './PropertiesPanel';
import CustomNode from './CustomNode';
import EnhancedNode from './EnhancedNode';
import AnimatedNode from './AnimatedNode';
import ConnectionLine from './ConnectionLine';
import AnimatedEdge from './AnimatedEdge';
import { motion } from 'framer-motion';
import { useToast } from "@/hooks/use-toast";
import {
  Button, 
  buttonVariants
} from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  ArrowDown, 
  ArrowUp, 
  Trash2, 
  Save, 
  Play, 
  Plus,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  Copy,
  ClipboardPaste,
  Download,
  Upload,
  RotateCcw,
  AlignCenter,
  StopCircle
} from 'lucide-react';
import workflowExecutionClient, { 
  ExecutionStatus, 
  NodeStatus, 
  ExecutionUpdate 
} from '@/lib/workflow-execution';

// Custom node types for all node types in the enum
// Import our custom nodes
import ConditionalNode from './nodes/ConditionalNode';

const nodeTypes = {
  // Default type
  default: EnhancedNode,
  
  // Trigger Nodes
  [NodeType.MANUAL_TRIGGER]: EnhancedNode,
  [NodeType.SCHEDULE_TRIGGER]: EnhancedNode,
  [NodeType.WEBHOOK_TRIGGER]: EnhancedNode,
  [NodeType.EVENT_TRIGGER]: EnhancedNode,
  
  // Input Nodes
  [NodeType.TEXT_INPUT]: EnhancedNode,
  [NodeType.FILE_INPUT]: EnhancedNode,
  [NodeType.DATA_SOURCE]: EnhancedNode,
  [NodeType.API_FETCH]: EnhancedNode,
  
  // Processing Nodes
  [NodeType.FILTER]: EnhancedNode,
  [NodeType.TRANSFORM]: EnhancedNode,
  [NodeType.MERGE]: EnhancedNode,
  [NodeType.SPLIT]: EnhancedNode,
  
  // AI Nodes
  [NodeType.OCR]: EnhancedNode,
  [NodeType.TEXT_GENERATION]: EnhancedNode,
  [NodeType.AGENT]: EnhancedNode,
  [NodeType.SCRAPER]: EnhancedNode,
  
  // Integration Nodes
  [NodeType.API_REQUEST]: EnhancedNode,
  [NodeType.DATABASE]: EnhancedNode,
  [NodeType.WEBHOOK]: EnhancedNode,
  
  // Output Nodes
  [NodeType.EMAIL]: EnhancedNode,
  [NodeType.NOTIFICATION]: EnhancedNode,
  [NodeType.FILE_OUTPUT]: EnhancedNode,
  [NodeType.DATA_EXPORT]: EnhancedNode,
  
  // Control Flow Nodes
  [NodeType.CONDITION]: ConditionalNode,
  [NodeType.SWITCH]: EnhancedNode,
  [NodeType.LOOP]: EnhancedNode,
  [NodeType.PARALLEL]: EnhancedNode,
  
  // Utility Nodes
  [NodeType.DELAY]: EnhancedNode,
  [NodeType.LOGGER]: EnhancedNode,
  [NodeType.CODE]: EnhancedNode,
  [NodeType.VARIABLE]: EnhancedNode,
  
  // LangGraph Nodes
  [NodeType.LANGGRAPH_STATE]: EnhancedNode,
  [NodeType.LANGGRAPH_NODE]: EnhancedNode,
  [NodeType.LANGGRAPH_EDGE]: EnhancedNode,
  [NodeType.LANGGRAPH_CONDITIONAL]: EnhancedNode,
  
  // Agent nodes
  [NodeType.AGENT_NODE]: EnhancedNode,
  [NodeType.AGENT_SUPERVISOR]: EnhancedNode,
  
  // Memory and context nodes
  [NodeType.MEMORY_STORE]: EnhancedNode,
  [NodeType.CONTEXT_RETRIEVER]: EnhancedNode,
  
  // Tool nodes
  [NodeType.TOOL_NODE]: EnhancedNode,
  [NodeType.TOOL_EXECUTOR]: EnhancedNode,
  
  // Conversation nodes
  [NodeType.CONVERSATION_CHAIN]: EnhancedNode,
  [NodeType.CONVERSATION_ROUTER]: EnhancedNode,
  
  // Output formatter nodes
  [NodeType.OUTPUT_PARSER]: EnhancedNode,
  [NodeType.OUTPUT_FORMATTER]: EnhancedNode,
  
  // LangChain specific nodes
  [NodeType.LANGCHAIN_LLM_CHAIN]: EnhancedNode,
  [NodeType.LANGCHAIN_AGENT]: EnhancedNode,
  [NodeType.LANGCHAIN_RETRIEVAL]: EnhancedNode,
  [NodeType.LANGCHAIN_MEMORY]: EnhancedNode,
  
  // OCR nodes
  [NodeType.OCR_PROCESSOR]: EnhancedNode,
  [NodeType.OCR_ENGINE_SELECTOR]: EnhancedNode,
  
  // Web Scraping nodes
  [NodeType.WEB_SCRAPER]: EnhancedNode,
  [NodeType.BROWSER_AUTOMATION]: EnhancedNode,
  
  // OSINT Research nodes
  [NodeType.OSINT_SEARCH]: EnhancedNode,
  [NodeType.OSINT_ANALYZER]: EnhancedNode,
  
  // Social Monitoring nodes
  [NodeType.SOCIAL_CONNECTOR]: EnhancedNode,
  [NodeType.SOCIAL_MONITOR]: EnhancedNode,
  
  // Agent Protocol nodes
  [NodeType.AGENT_PROTOCOL]: EnhancedNode,
  [NodeType.AGENT_PROTOCOL_CONNECTOR]: EnhancedNode,
  
  // Guardrails nodes
  [NodeType.GUARDRAIL_FILTER]: EnhancedNode,
  [NodeType.GUARDRAIL_MODIFIER]: EnhancedNode,
  
  // Runtime nodes
  [NodeType.RUNTIME_EXECUTOR]: EnhancedNode,
  [NodeType.RUNTIME_ENVIRONMENT]: EnhancedNode,
  
  // Memory Management nodes
  [NodeType.MEMORY_DASHBOARD]: EnhancedNode,
  
  // RAG nodes
  [NodeType.RAG_RETRIEVER]: EnhancedNode,
  [NodeType.RAG_DB_SWITCH]: EnhancedNode,
  
  // Vector DB nodes
  [NodeType.VECTOR_STORE]: EnhancedNode,
  [NodeType.VECTOR_SEARCH]: EnhancedNode,
  [NodeType.VECTOR_INDEX]: EnhancedNode,
  
  // Telemetry nodes
  [NodeType.TELEMETRY_COLLECTOR]: EnhancedNode,
  [NodeType.TELEMETRY_ALERT]: EnhancedNode,
  
  // Activity Logger nodes
  [NodeType.ACTIVITY_LOGGER]: EnhancedNode,
  [NodeType.AUDIT_TRAIL]: EnhancedNode,
  
  // Search nodes
  [NodeType.UNIFIED_SEARCH]: EnhancedNode,
  [NodeType.SAVED_SEARCH]: EnhancedNode,
  
  // Execution Stats nodes
  [NodeType.EXECUTION_STATS]: EnhancedNode,
  [NodeType.PERFORMANCE_MONITOR]: EnhancedNode,
  
  // User Preferences nodes
  [NodeType.USER_PREFERENCES]: EnhancedNode,
  [NodeType.PREFERENCE_SYNC]: EnhancedNode,
  
  // Animated node for execution visualization
  animated: AnimatedNode,
};

// Custom edge types
const edgeTypes = {
  default: AnimatedEdge,
};

interface WorkflowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node[], edges: Edge[]) => void;
  readOnly?: boolean;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  initialNodes = [],
  initialEdges = [],
  onSave,
  readOnly = false,
}) => {
  // Initialize toast
  const { toast } = useToast();
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [connectionNodeId, setConnectionNodeId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<{nodes: Node[], edges: Edge[]}[]>([]);
  const [redoStack, setRedoStack] = useState<{nodes: Node[], edges: Edge[]}[]>([]);
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([]);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const [nodeStatuses, setNodeStatuses] = useState<Record<string, {status: string, error?: string}>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, any>>({});
  const [executionClient] = useState(() => workflowExecutionClient);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [failedNodes, setFailedNodes] = useState<Set<string>>(new Set());
  const [executionStartTime, setExecutionStartTime] = useState<Date | null>(null);

  // Key press states
  const deletePressed = useKeyPress(['Delete', 'Backspace']);
  const ctrlPressed = useKeyPress(['Control', 'Meta']);
  const shiftPressed = useKeyPress('Shift');
  const zPressed = useKeyPress('z');
  const yPressed = useKeyPress('y');
  const cPressed = useKeyPress('c');
  const vPressed = useKeyPress('v');

  // Save current state to undo stack before making changes
  const saveStateToHistory = useCallback(() => {
    setUndoStack(prev => [...prev, { nodes, edges }]);
    setRedoStack([]);
  }, [nodes, edges]);

  // Handle undo operation
  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack(prev => [...prev, { nodes, edges }]);
      setUndoStack(prev => prev.slice(0, -1));
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
    }
  }, [undoStack, nodes, edges]);

  // Handle redo operation
  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack(prev => [...prev, { nodes, edges }]);
      setRedoStack(prev => prev.slice(0, -1));
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }
  }, [redoStack, nodes, edges]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (ctrlPressed && zPressed && !readOnly) {
      handleUndo();
    } else if ((ctrlPressed && yPressed) || (ctrlPressed && shiftPressed && zPressed) && !readOnly) {
      handleRedo();
    } else if (ctrlPressed && cPressed) {
      // Copy selected nodes
      const selectedNodes = nodes.filter(node => node.selected);
      if (selectedNodes.length > 0) {
        setCopiedNodes(selectedNodes);
      }
    } else if (ctrlPressed && vPressed && !readOnly) {
      // Paste copied nodes
      if (copiedNodes.length > 0) {
        saveStateToHistory();
        const offsetX = 50;
        const offsetY = 50;
        const newNodes = copiedNodes.map(node => {
          const id = `${node.id}-copy-${Date.now()}`;
          return {
            ...node,
            id,
            position: {
              x: node.position.x + offsetX,
              y: node.position.y + offsetY,
            },
            selected: false,
          };
        });
        setNodes(nds => [...nds, ...newNodes]);
      }
    }
  }, [
    ctrlPressed, zPressed, yPressed, shiftPressed, cPressed, vPressed, 
    handleUndo, handleRedo, nodes, readOnly, copiedNodes
  ]);

  // Handle selection changes
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes, edges: selectedEdges }) => {
      if (selectedNodes.length > 0) {
        setSelectedNode(selectedNodes[0] as Node);
        setSelectedEdge(null);
      } else if (selectedEdges.length > 0) {
        setSelectedEdge(selectedEdges[0] as Edge);
        setSelectedNode(null);
      } else {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    },
  });

  // Handle node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Check if position change is happening
      const positionChanges = changes.filter(change => change.type === 'position');
      
      // Add to undo stack only for position changes and not during dragging
      if (positionChanges.length > 0 && !isDragging) {
        setIsDragging(true);
      }
      
      // Apply changes - convert to our Node type to ensure compatibility
      setNodes((nds) => {
        const updatedNodes = applyNodeChanges(changes, nds as ReactFlowNode[]) as unknown as Node[];
        return updatedNodes;
      });
    },
    [isDragging]
  );

  // Save position changes to history when drag ends
  useEffect(() => {
    if (!isDragging) return;
    
    const handleDragEnd = () => {
      saveStateToHistory();
      setIsDragging(false);
    };
    
    document.addEventListener('mouseup', handleDragEnd);
    
    return () => {
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, saveStateToHistory]);

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Save state before removing edges
      const removeChanges = changes.filter(change => change.type === 'remove');
      if (removeChanges.length > 0) {
        saveStateToHistory();
      }
      
      // Apply changes - convert to our Edge type to ensure compatibility
      setEdges((eds) => {
        const updatedEdges = applyEdgeChanges(changes, eds as any) as unknown as Edge[];
        return updatedEdges;
      });
    },
    [saveStateToHistory]
  );

  // Handle new connections
  const onConnect = useCallback(
    (connection: Connection) => {
      saveStateToHistory();
      
      // Find the source and target nodes
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);
      
      if (sourceNode && targetNode && connection.source && connection.target) {
        // Check if the connection is valid
        if (isValidConnection(sourceNode, targetNode, connection.sourceHandle || undefined, connection.targetHandle || undefined)) {
          // Create a new edge
          const newEdge = createEdge(
            connection.source,
            connection.target,
            connection.sourceHandle || undefined,
            connection.targetHandle || undefined
          );
          
          // Add animated pulse effect for new connections
          newEdge.animated = true;
          newEdge.data = {
            ...newEdge.data,
            pulse: true,
            status: 'active'
          };
          
          // Apply the edge with proper type casting
          setEdges((eds) => {
            const updatedEdges = addEdge(newEdge, eds as any) as unknown as Edge[];
            return updatedEdges;
          });
          
          // Remove the animation after a short delay
          setTimeout(() => {
            setEdges(eds => 
              eds.map(edge => 
                edge.id === newEdge.id 
                  ? { ...edge, animated: false, data: { ...edge.data, pulse: false, status: 'default' } } 
                  : edge
              )
            );
          }, 2000);
        }
      }
      
      // Reset connection node highlight
      setConnectionNodeId(null);
    },
    [nodes, saveStateToHistory]
  );

  // Handle connection start
  const onConnectStart = useCallback(
    (_: any, params: any) => {
      if (params.nodeId) {
        setConnectionNodeId(params.nodeId);
      }
    },
    []
  );

  // Handle connection end
  const onConnectEnd = useCallback(
    () => {
      setConnectionNodeId(null);
    },
    []
  );

  // Add a new node to the canvas
  const onAddNode = useCallback(
    (type: NodeType, position: Position) => {
      saveStateToHistory();
      const newNode = createNode(type, position);
      setNodes((nds) => [...nds, newNode]);
      return newNode;
    },
    [saveStateToHistory]
  );

  // Handle node drop from panel
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      
      try {
        if (reactFlowWrapper.current && reactFlowInstance) {
          const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
          const type = event.dataTransfer.getData('application/reactflow/type');
          
          // Check if the dropped element has a valid node type
          if (type && type.trim() !== '') {
            // Calculate the position where the node should be placed
            const position = reactFlowInstance.screenToFlowPosition({
              x: event.clientX - reactFlowBounds.left,
              y: event.clientY - reactFlowBounds.top,
            });
            
            console.log("Dropping node of type:", type, "at position:", position);
            
            // Save state before adding new node
            saveStateToHistory();
            
            try {
              // Create and add the new node - with error handling
              const newNode = createNode(type as NodeType, position);
              
              if (!newNode) {
                console.error("Failed to create node of type:", type);
                return;
              }
              
              setNodes((nds) => [...nds, newNode]);
              
              // Highlight the new node briefly
              setTimeout(() => {
                setNodes((nds) =>
                  nds.map((node) => (node.id === newNode.id ? { ...node, selected: true } : node))
                );
              }, 100);
            } catch (err) {
              console.error("Error creating node:", err);
            }
          } else {
            console.error("Invalid or empty node type dropped:", type);
          }
        }
      } catch (err) {
        console.error("Error in onDrop:", err);
      }
    },
    [reactFlowInstance, saveStateToHistory]
  );

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle node data update
  const onNodeDataUpdate = useCallback(
    (nodeId: string, data: any) => {
      saveStateToHistory();
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
    [saveStateToHistory]
  );

  // Delete selected nodes or edges
  const onDelete = useCallback(() => {
    saveStateToHistory();
    
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      // Also delete connected edges
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
  }, [selectedNode, selectedEdge, saveStateToHistory]);

  // Save the workflow
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
  }, [nodes, edges, onSave]);

  // Clear the workflow
  const handleClear = useCallback(() => {
    if (window.confirm('Are you sure you want to clear the workflow? This cannot be undone.')) {
      saveStateToHistory();
      setNodes([]);
      setEdges([]);
      setSelectedNode(null);
      setSelectedEdge(null);
    }
  }, [saveStateToHistory]);
  
  // Handle execution updates
  const handleExecutionUpdate = useCallback((update: ExecutionUpdate) => {
    console.log('Execution update:', update);
    
    // Update execution status
    setExecutionStatus(update.status);
    
    // Update node status
    if (update.nodeId && update.nodeStatus) {
      if (update.nodeStatus === 'running') {
        setActiveNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(update.nodeId!);
          return newSet;
        });
      } else if (update.nodeStatus === 'completed') {
        setActiveNodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.nodeId!);
          return newSet;
        });
        setCompletedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(update.nodeId!);
          return newSet;
        });
      } else if (update.nodeStatus === 'failed') {
        setActiveNodes(prev => {
          const newSet = new Set(prev);
          newSet.delete(update.nodeId!);
          return newSet;
        });
        setFailedNodes(prev => {
          const newSet = new Set(prev);
          newSet.add(update.nodeId!);
          return newSet;
        });
      }
    }
    
    // Check if execution is complete
    if (['completed', 'failed', 'stopped'].includes(update.status)) {
      setIsExecuting(false);
      
      // Show toast notification
      if (update.status === 'completed') {
        toast({
          title: 'Execution Completed',
          description: 'Workflow execution completed successfully',
          variant: 'default',
        });
      } else if (update.status === 'failed') {
        toast({
          title: 'Execution Failed',
          description: update.error || 'Workflow execution failed',
          variant: 'destructive',
        });
      } else if (update.status === 'stopped') {
        toast({
          title: 'Execution Stopped',
          description: 'Workflow execution was stopped',
          variant: 'default',
        });
      }
    }
  }, []);
  
  // Initialize execution
  const initExecution = useCallback(() => {
    // Reset execution state
    setActiveNodes(new Set());
    setCompletedNodes(new Set());
    setFailedNodes(new Set());
    setExecutionStatus('pending');
    setExecutionStartTime(new Date());
    
    // Update node styles to show pending state
    setNodes(nds => 
      nds.map(node => ({
        ...node,
        data: {
          ...node.data,
          executionStatus: 'pending'
        }
      }))
    );
    
    // Reset edge styles
    setEdges(eds =>
      eds.map(edge => ({
        ...edge,
        animated: false,
        data: {
          ...edge.data,
          status: 'default'
        }
      }))
    );
  }, []);
  
  // Run the workflow
  const handleRunWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      toast({
        title: 'No Nodes',
        description: 'Please add at least one node to the workflow',
        variant: 'destructive',
      });
      return;
    }
    
    if (isExecuting) return;
    
    try {
      // Initialize execution state
      setIsExecuting(true);
      initExecution();
      
      // Subscribe to execution updates
      const unsubscribeFromUpdates = workflowExecutionClient.subscribeToAllUpdates(handleExecutionUpdate);
      
      // Execute workflow
      const execId = await workflowExecutionClient.executeWorkflow(
        1, // TODO: Use actual workflow ID from props/context
        { nodes, edges },
        {} // Initial variables
      );
      
      // Store execution ID
      setExecutionId(execId);
      
      // Return cleanup function to unsubscribe from updates
      return () => {
        unsubscribeFromUpdates();
      };
    } catch (error) {
      console.error('Error executing workflow:', error);
      setIsExecuting(false);
      toast({
        title: 'Execution Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [nodes, edges, isExecuting, initExecution, handleExecutionUpdate]);
  
  // Stop the workflow execution
  const handleStopWorkflow = useCallback(async () => {
    if (!isExecuting || !executionId) return;
    
    try {
      await workflowExecutionClient.stopExecution(executionId);
      
      // Note: Don't set isExecuting to false here
      // Wait for the execution update event with 'stopped' status
    } catch (error) {
      console.error('Error stopping workflow:', error);
      toast({
        title: 'Stop Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }, [isExecuting, executionId]);

  // Auto-layout the workflow (simple grid layout)
  const handleAutoLayout = useCallback(() => {
    saveStateToHistory();
    
    if (nodes.length === 0) return;
    
    // Simple grid layout
    const GRID_SIZE = 250;
    const MAX_COLS = 5;
    
    const newNodes = [...nodes];
    let row = 0;
    let col = 0;
    
    // Sort nodes based on connections (simple topological sort)
    const nodeById: Record<string, number> = {};
    newNodes.forEach((node, index) => {
      nodeById[node.id] = index;
    });
    
    // Count incoming edges for each node
    const incomingEdgeCount: Record<string, number> = {};
    nodes.forEach(node => {
      incomingEdgeCount[node.id] = 0;
    });
    
    edges.forEach(edge => {
      if (incomingEdgeCount[edge.target] !== undefined) {
        incomingEdgeCount[edge.target]++;
      }
    });
    
    // Find nodes with no incoming edges (sources)
    const sources = nodes
      .filter(node => incomingEdgeCount[node.id] === 0)
      .map(node => node.id);
    
    // Assign positions to source nodes first
    sources.forEach(sourceId => {
      const index = nodeById[sourceId];
      if (index !== undefined) {
        newNodes[index] = {
          ...newNodes[index],
          position: {
            x: col * GRID_SIZE,
            y: row * GRID_SIZE,
          }
        };
        
        col++;
        if (col >= MAX_COLS) {
          col = 0;
          row++;
        }
        
        // Remove from incomingEdgeCount to mark as processed
        delete incomingEdgeCount[sourceId];
      }
    });
    
    // Position remaining nodes
    while (Object.keys(incomingEdgeCount).length > 0) {
      // Find nodes where all dependencies are positioned
      const readyNodeIds = Object.keys(incomingEdgeCount).filter(nodeId => {
        const incoming = edges.filter(edge => edge.target === nodeId);
        // Check if all sources are already positioned
        return incoming.every(edge => !incomingEdgeCount[edge.source]);
      });
      
      if (readyNodeIds.length === 0) {
        // Break circular dependencies
        const nextNodeId = Object.keys(incomingEdgeCount)[0];
        readyNodeIds.push(nextNodeId);
      }
      
      // Position ready nodes
      readyNodeIds.forEach(nodeId => {
        const index = nodeById[nodeId];
        if (index !== undefined) {
          newNodes[index] = {
            ...newNodes[index],
            position: {
              x: col * GRID_SIZE,
              y: row * GRID_SIZE,
            }
          };
          
          col++;
          if (col >= MAX_COLS) {
            col = 0;
            row++;
          }
          
          // Remove from incomingEdgeCount to mark as processed
          delete incomingEdgeCount[nodeId];
        }
      });
    }
    
    setNodes(newNodes);
    
    // Center the view
    setTimeout(() => {
      if (reactFlowInstance) {
        reactFlowInstance.fitView({ padding: 0.2 });
      }
    }, 50);
  }, [nodes, edges, saveStateToHistory, reactFlowInstance]);

  // Export workflow to JSON
  const handleExport = useCallback(() => {
    const workflow = {
      nodes,
      edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
      }
    };
    
    const dataStr = JSON.stringify(workflow, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `workflow-${Date.now()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }, [nodes, edges]);

  // Import workflow from JSON
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (!target.files?.length) return;
      
      const file = target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event: ProgressEvent<FileReader>) => {
        try {
          const result = event.target?.result;
          if (typeof result !== 'string') return;
          
          const workflow = JSON.parse(result);
          
          if (workflow.nodes && workflow.edges) {
            saveStateToHistory();
            setNodes(workflow.nodes);
            setEdges(workflow.edges);
            
            // Center the view
            setTimeout(() => {
              if (reactFlowInstance) {
                reactFlowInstance.fitView({ padding: 0.2 });
              }
            }, 50);
          }
        } catch (error) {
          console.error('Failed to parse workflow JSON:', error);
          alert('Failed to import workflow. Invalid JSON format.');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }, [saveStateToHistory, reactFlowInstance]);

  return (
    <div className="w-full h-full flex" style={{ minHeight: '500px' }}>
      <NodePanel />
      
      <div className="flex-1 h-full relative" ref={reactFlowWrapper} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          deleteKeyCode={['Backspace', 'Delete']}
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          connectionLineComponent={ConnectionLine}
          fitView
          attributionPosition="bottom-right"
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          minZoom={0.1}
          maxZoom={4}
        >
          {showGrid && <Background 
            color="#aaaaaa" 
            gap={16} 
            size={1}
            variant={BackgroundVariant.Dots}
          />}
          
          <Controls showInteractive={true} />
          
          {/* Canvas toolbar */}
          <Panel position="top-right" className="flex gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleSave}
                    disabled={readOnly}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save workflow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleUndo}
                    disabled={undoStack.length === 0 || readOnly}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRedo}
                    disabled={redoStack.length === 0 || readOnly}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      const selectedNodes = nodes.filter(node => node.selected);
                      if (selectedNodes.length > 0) {
                        setCopiedNodes(selectedNodes);
                      }
                    }}
                    disabled={!nodes.some(node => node.selected)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy selected nodes (Ctrl+C)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (copiedNodes.length > 0) {
                        saveStateToHistory();
                        const offsetX = 50;
                        const offsetY = 50;
                        const newNodes = copiedNodes.map(node => {
                          const id = `${node.id}-copy-${Date.now()}`;
                          return {
                            ...node,
                            id,
                            position: {
                              x: node.position.x + offsetX,
                              y: node.position.y + offsetY,
                            },
                            selected: false,
                          };
                        });
                        setNodes(nds => [...nds, ...newNodes]);
                      }
                    }}
                    disabled={copiedNodes.length === 0 || readOnly}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Paste copied nodes (Ctrl+V)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onDelete}
                    disabled={!selectedNode && !selectedEdge || readOnly}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected (Delete)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClear}
                    disabled={nodes.length === 0 || readOnly}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Clear workflow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAutoLayout}
                    disabled={nodes.length === 0 || readOnly}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Auto-layout workflow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowGrid(!showGrid)}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showGrid ? 'Hide grid' : 'Show grid'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    disabled={readOnly}
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                      <path d="M0.5 0.5H14.5V14.5H0.5V0.5ZM1.5 1.5V3.5H3.5V1.5H1.5ZM3.5a1 1 0 0 1-1 1H1.5v2h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-1v2h1a1 1 0 0 1 1 1v1h2v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1h2v-1a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1h2v-2h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1v-2h-1a1 1 0 0 1-1-1v-1a1 1 0 0 1 1-1h1v-2h-2v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1h-2v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1h-2v2h1a1 1 0 0 1 1 1v1z" 
                      fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <div className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExport}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export workflow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleImport}
                    disabled={readOnly}
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Import workflow</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Panel>
          
          {/* Action buttons for workflow execution */}
          <Panel position="bottom-center" className="mb-4">
            <div className="flex gap-2">
              {isExecuting ? (
                <Button 
                  size="lg"
                  variant="destructive"
                  className="shadow-lg"
                  onClick={handleStopWorkflow}
                >
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Execution
                </Button>
              ) : (
                <Button 
                  size="lg"
                  className="shadow-lg"
                  onClick={handleRunWorkflow}
                  disabled={nodes.length === 0}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Run Workflow
                </Button>
              )}
            </div>
            {executionStatus && executionStartTime && (
              <div className="mt-2 text-center text-xs text-slate-500">
                <div className="flex justify-center items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    executionStatus === 'running' ? 'bg-blue-500 animate-pulse' :
                    executionStatus === 'completed' ? 'bg-green-500' :
                    executionStatus === 'failed' ? 'bg-red-500' : 
                    'bg-yellow-500'
                  }`}></div>
                  <span>Status: {executionStatus}</span>
                </div>
              </div>
            )}
          </Panel>
          
          {/* Connection validation indicator - this will be hidden until a connection is started */}
          {connectionNodeId && (
            <div className="absolute bottom-4 right-4 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3 z-10 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span className="text-sm font-medium">Connecting from node</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Drag to a valid target node to create a connection
              </div>
            </div>
          )}
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
const WorkflowCanvasWithProvider: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvas {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvasWithProvider;