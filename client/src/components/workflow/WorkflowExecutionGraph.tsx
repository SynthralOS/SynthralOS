import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Edge, 
  EdgeTypes, 
  MiniMap, 
  Node, 
  NodeTypes,
  MarkerType,
  useEdgesState,
  useNodesState,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { ExecutionStatus } from '@shared/schema';

interface WorkflowExecutionGraphProps {
  workflow: any;
  nodeExecutions: any[];
  height?: string;
  onNodeClick?: (nodeId: string) => void;
}

// Custom node types
const nodeColors = {
  [ExecutionStatus.COMPLETED]: '#10b981', // green
  [ExecutionStatus.RUNNING]: '#3b82f6',   // blue
  [ExecutionStatus.FAILED]: '#ef4444',    // red
  [ExecutionStatus.CANCELLED]: '#f97316', // orange
  [ExecutionStatus.PAUSED]: '#eab308',    // yellow
  [ExecutionStatus.QUEUED]: '#6b7280',    // gray
};

// Task Node component
const TaskNode = ({ data }: { data: any }) => {
  return (
    <div className={`px-4 py-2 shadow-md rounded-md border-2 ${
      data.status === ExecutionStatus.COMPLETED ? 'border-green-500 bg-green-50' : 
      data.status === ExecutionStatus.RUNNING ? 'border-blue-500 bg-blue-50' :
      data.status === ExecutionStatus.FAILED ? 'border-red-500 bg-red-50' :
      data.status === ExecutionStatus.CANCELLED ? 'border-orange-500 bg-orange-50' :
      data.status === ExecutionStatus.PAUSED ? 'border-yellow-500 bg-yellow-50' :
      'border-gray-500 bg-gray-50'
    }`}>
      <div className="flex items-center">
        <div className="ml-2">
          <div className="text-xs font-bold">{data.label}</div>
          <div className="text-xs text-gray-500">{data.type}</div>
        </div>
      </div>
      {data.status && (
        <Badge className={`mt-2 ${
          data.status === ExecutionStatus.COMPLETED ? 'bg-green-500' : 
          data.status === ExecutionStatus.RUNNING ? 'bg-blue-500' :
          data.status === ExecutionStatus.FAILED ? 'bg-red-500' :
          data.status === ExecutionStatus.CANCELLED ? 'bg-orange-500' :
          data.status === ExecutionStatus.PAUSED ? 'bg-yellow-500' :
          'bg-gray-500'
        }`}>
          {data.status}
        </Badge>
      )}
    </div>
  );
};

// Custom node types 
const nodeTypes = {
  task: TaskNode,
};

// Helper function to generate nodes and edges from workflow definition and execution data
const generateGraphElements = (workflow: any, nodeExecutions: any[]): { nodes: Node[], edges: Edge[] } => {
  // If no workflow data is available, return empty arrays
  if (!workflow || !workflow.definition) {
    return { nodes: [], edges: [] };
  }

  const nodeMap = new Map();
  if (nodeExecutions) {
    nodeExecutions.forEach(node => {
      nodeMap.set(node.nodeId, node);
    });
  }

  try {
    // Parse workflow definition if it's a string
    const workflowDefinition = typeof workflow.definition === 'string' 
      ? JSON.parse(workflow.definition) 
      : workflow.definition;

    // Nodes from workflow definition
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // If the workflow definition has nodes property
    if (workflowDefinition.nodes) {
      const nodeEntries = Array.isArray(workflowDefinition.nodes) 
        ? workflowDefinition.nodes 
        : Object.entries(workflowDefinition.nodes).map(([id, data]) => ({ id, ...data }));
      
      nodeEntries.forEach((node: any, index: number) => {
        const nodeId = node.id || `node-${index}`;
        const nodeExecution = nodeMap.get(nodeId);
        const status = nodeExecution ? nodeExecution.status : ExecutionStatus.QUEUED;
        
        nodes.push({
          id: nodeId,
          type: 'task',
          position: node.position || { x: index * 200, y: 100 },
          data: {
            label: node.name || node.label || `Task ${index + 1}`,
            type: node.type || 'Unknown',
            status: status,
            execution: nodeExecution
          }
        });
      });
    }
    
    // If the workflow definition has edges or connections property
    if (workflowDefinition.edges || workflowDefinition.connections) {
      const edgeEntries = workflowDefinition.edges || workflowDefinition.connections || [];
      
      edgeEntries.forEach((edge: any, index: number) => {
        edges.push({
          id: edge.id || `edge-${index}`,
          source: edge.source,
          target: edge.target,
          animated: nodeMap.get(edge.source)?.status === ExecutionStatus.RUNNING,
          style: { stroke: nodeMap.get(edge.source)?.status === ExecutionStatus.FAILED ? '#ef4444' : '#888' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: nodeMap.get(edge.source)?.status === ExecutionStatus.FAILED ? '#ef4444' : '#888',
          }
        });
      });
    }
    
    return { nodes, edges };
  } catch (error) {
    console.error("Error parsing workflow definition:", error);
    return { nodes: [], edges: [] };
  }
};

const WorkflowExecutionGraph: React.FC<WorkflowExecutionGraphProps> = ({ 
  workflow, 
  nodeExecutions,
  height = '400px',
  onNodeClick
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);

  // Update graph when workflow or node executions change
  useEffect(() => {
    if (workflow) {
      setLoading(true);
      try {
        const { nodes: newNodes, edges: newEdges } = generateGraphElements(workflow, nodeExecutions);
        setNodes(newNodes);
        setEdges(newEdges);
      } catch (error) {
        console.error("Error generating workflow graph:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [workflow, nodeExecutions, setNodes, setEdges]);

  // Handle node click
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  }, [onNodeClick]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Workflow Execution Graph
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height }} className="flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Execution Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={handleNodeClick}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background gap={12} size={1} />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};

export default WorkflowExecutionGraph;