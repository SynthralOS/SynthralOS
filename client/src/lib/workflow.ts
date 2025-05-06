import { v4 as uuidv4 } from 'uuid';
import { NodeType, nodeDefinitions } from './node-types';
import { apiRequest } from '@/lib/queryClient';
import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';
import { 
  ExecutionStatus as SchemaExecutionStatus,
  NodePosition
} from '@shared/schema';

// Define Node and Edge interfaces directly here to avoid import issues
export interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any; // Required property
  selected?: boolean;
  dragging?: boolean;
  sourcePosition?: NodePosition | string;
  targetPosition?: NodePosition | string;
  width?: number;
  height?: number;
  [key: string]: any;
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  label?: string;
  selected?: boolean;
  type?: string;
  [key: string]: any;
}

// Re-export NodePosition for consistency
export { NodePosition };

// Position type used for node placement
export interface Position {
  x: number;
  y: number;
}

// Workflow data structure
export interface WorkflowData {
  nodes: Node[];
  edges: Edge[];
}

// Workflow type
export interface Workflow {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  data: WorkflowData;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  tags: string[];
  version?: number;
}

// For backward compatibility
export const getNodesFromWorkflow = (workflow: Workflow): Node[] => {
  if (workflow.data && workflow.data.nodes) {
    return workflow.data.nodes;
  }
  // @ts-ignore - Handle older workflows that might have nodes at the root level
  return workflow.nodes || [];
};

// For backward compatibility
export const getEdgesFromWorkflow = (workflow: Workflow): Edge[] => {
  if (workflow.data && workflow.data.edges) {
    return workflow.data.edges;
  }
  // @ts-ignore - Handle older workflows that might have edges at the root level
  return workflow.edges || [];
}

// Execution status
export enum ExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Execution result
export interface ExecutionResult {
  id: number;
  workflowId: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  logs: string[];
  result: any;
  error: string | null;
}

// Node execution result
export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  input: any;
  output: any;
  error: string | null;
}

// Create a new node
export function createNode(type: NodeType, position: Position): Node {
  // Make sure the node type exists in the definitions
  const nodeDefinition = nodeDefinitions[type];
  
  if (!nodeDefinition) {
    console.error(`Node type ${type} not found in node definitions`);
    // Create a fallback node if the type doesn't exist
    return {
      id: uuidv4(),
      type: 'default', // Use a default type that we know exists
      position,
      data: {
        label: `Unknown Node (${type})`,
        description: 'This node type is not properly defined.',
        category: 'Utility',
        inputs: 1,
        outputs: 1,
      },
    };
  }
  
  // Create the node with properties from the definition and standard positions
  return {
    id: uuidv4(),
    type,
    position,
    sourcePosition: NodePosition.Right, // Use standardized position enum
    targetPosition: NodePosition.Left,  // Use standardized position enum
    data: {
      ...nodeDefinition.defaultData || {},
      label: nodeDefinition.label,
      description: nodeDefinition.description,
      category: nodeDefinition.category,
      icon: nodeDefinition.icon || 'HelpCircle',
      inputs: nodeDefinition.inputs,
      outputs: nodeDefinition.outputs,
    },
  };
}

// Create a new edge between nodes
export function createEdge(source: string, target: string, sourceHandle?: string, targetHandle?: string): Edge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    sourceHandle,
    targetHandle,
    animated: false,
  };
}

// Check if an edge connection is valid
export function isValidConnection(source: Node, target: Node, sourceHandle?: string, targetHandle?: string): boolean {
  // Check if source node has outputs
  const sourceNodeDef = nodeDefinitions[source.type as NodeType];
  if (!sourceNodeDef || sourceNodeDef.outputs === 0) {
    return false;
  }
  
  // Check if target node has inputs
  const targetNodeDef = nodeDefinitions[target.type as NodeType];
  if (!targetNodeDef || targetNodeDef.inputs === 0) {
    return false;
  }
  
  // Check if target already has max inputs
  // TODO: Implement this check when we have a more advanced edge model
  
  return true;
}

// Calculate the next node position based on the current one
export function calculateNextNodePosition(position: Position): Position {
  return {
    x: position.x + 250,
    y: position.y,
  };
}

// CRUD operations for workflows
export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await apiRequest('GET', '/api/workflows');
  return response.json();
}

export async function fetchWorkflow(id: number): Promise<Workflow> {
  const response = await apiRequest('GET', `/api/workflows/${id}`);
  return response.json();
}

export async function createWorkflow(workflowData: Partial<Workflow>): Promise<Workflow> {
  const response = await apiRequest('POST', '/api/workflows', workflowData);
  return response.json();
}

export async function updateWorkflow(id: number, workflowData: Partial<Workflow>): Promise<Workflow> {
  const response = await apiRequest('PUT', `/api/workflows/${id}`, workflowData);
  return response.json();
}

export async function deleteWorkflow(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/workflows/${id}`);
}

// Workflow execution
export async function executeWorkflow(id: number, inputs?: Record<string, any>): Promise<ExecutionResult> {
  const response = await apiRequest('POST', `/api/workflows/${id}/execute`, { inputs });
  return response.json();
}

export async function fetchWorkflowExecutions(workflowId: number): Promise<ExecutionResult[]> {
  const response = await apiRequest('GET', `/api/workflows/${workflowId}/executions`);
  return response.json();
}

export async function fetchExecution(id: number): Promise<ExecutionResult> {
  const response = await apiRequest('GET', `/api/executions/${id}`);
  return response.json();
}

// LangGraph functions for workflow execution
export interface LangGraphNode {
  id: string;
  type: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  config: Record<string, any>;
}

export interface LangGraphEdge {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}

export interface LangGraph {
  nodes: LangGraphNode[];
  edges: LangGraphEdge[];
}

// Convert React Flow nodes/edges to LangGraph format for execution
export function convertToLangGraph(nodes: Node[], edges: Edge[]): LangGraph {
  const langGraphNodes: LangGraphNode[] = nodes.map(node => ({
    id: node.id,
    type: node.type || 'default',
    inputs: {},
    outputs: {},
    config: node.data,
  }));
  
  const langGraphEdges: LangGraphEdge[] = edges.map(edge => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromPort: edge.sourceHandle || 'output',
    toPort: edge.targetHandle || 'input',
  }));
  
  return {
    nodes: langGraphNodes,
    edges: langGraphEdges,
  };
}

// Get nodes that can be executed in parallel (have all inputs satisfied)
export function getReadyNodes(graph: LangGraph, executedNodes: Set<string>): string[] {
  const nodeInputs: Record<string, Set<string>> = {};
  const readyNodes: string[] = [];
  
  // Initialize nodeInputs
  graph.nodes.forEach(node => {
    nodeInputs[node.id] = new Set();
  });
  
  // Fill in the inputs for each node
  graph.edges.forEach(edge => {
    if (nodeInputs[edge.to]) {
      nodeInputs[edge.to].add(edge.from);
    }
  });
  
  // Find nodes that have all inputs executed
  for (const [nodeId, inputs] of Object.entries(nodeInputs)) {
    const allInputsExecuted = Array.from(inputs).every(inputId => executedNodes.has(inputId));
    if (allInputsExecuted && !executedNodes.has(nodeId)) {
      readyNodes.push(nodeId);
    }
  }
  
  // Add nodes with no inputs (that haven't been executed yet)
  graph.nodes.forEach(node => {
    if (nodeInputs[node.id].size === 0 && !executedNodes.has(node.id)) {
      readyNodes.push(node.id);
    }
  });
  
  return readyNodes;
}

// Serialize workflow for storage
export function serializeWorkflow(nodes: Node[], edges: Edge[]): string {
  return JSON.stringify({ nodes, edges });
}

// Deserialize workflow from storage
export function deserializeWorkflow(serialized: string): { nodes: Node[], edges: Edge[] } {
  return JSON.parse(serialized);
}

// Get input schema for node based on its type
export function getNodeInputSchema(nodeType: NodeType): Record<string, any> {
  const nodeDef = nodeDefinitions[nodeType];
  if (!nodeDef) {
    return {};
  }
  
  // Since ZodType doesn't expose shape directly, return an empty object
  // To be implemented with proper schema extraction if needed
  return {};
}

// Get a list of nodes by category
export function getNodesByCategory(category: string): NodeType[] {
  return Object.values(NodeType).filter(
    nodeType => nodeDefinitions[nodeType].category === category
  );
}

// Organize nodes by their categories
export function organizeNodesByCategory(): Record<string, NodeType[]> {
  const result: Record<string, NodeType[]> = {};
  
  Object.values(NodeType).forEach(nodeType => {
    const category = nodeDefinitions[nodeType].category;
    if (!result[category]) {
      result[category] = [];
    }
    result[category].push(nodeType);
  });
  
  return result;
}