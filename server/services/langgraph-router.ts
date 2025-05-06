/**
 * LangGraph Router Service
 * 
 * This service is responsible for routing and dispatching in LangGraph workflows.
 * It handles determining which nodes should be executed next based on the current state.
 */

import { NodeType } from '@/lib/node-types';
import { ExecutionStatus } from '@/lib/workflow';
import { WebSocketEvent } from '../types';

// Define types for routing
interface Node {
  id: string;
  type: string;
  data: any;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: any;
}

interface Route {
  nodeId: string;
  condition: string;
}

interface RouterState {
  routes: Route[];
  currentNodeId: string | null;
  history: string[];
  context: any;
}

/**
 * LangGraph Router class
 * Handles routing and dispatching in LangGraph workflows
 */
export class LangGraphRouter {
  private nodes: Node[];
  private edges: Edge[];
  private state: RouterState;
  private sendWebSocketEvent: (event: WebSocketEvent) => void;
  private executionId: number;

  constructor(nodes: Node[], edges: Edge[], executionId: number, sendWebSocketEvent: (event: WebSocketEvent) => void) {
    this.nodes = nodes;
    this.edges = edges;
    this.executionId = executionId;
    this.sendWebSocketEvent = sendWebSocketEvent;
    this.state = {
      routes: [],
      currentNodeId: null,
      history: [],
      context: {},
    };
  }

  /**
   * Initialize the router with the entry point node
   */
  public initialize(): string | null {
    // Find the entry point (trigger) node
    const entryNode = this.findEntryPoint();
    
    if (entryNode) {
      this.state.currentNodeId = entryNode.id;
      this.state.history.push(entryNode.id);
      
      return entryNode.id;
    }
    
    return null;
  }

  /**
   * Reset the router state
   */
  public reset(): void {
    this.state.currentNodeId = null;
    this.state.history = [];
    this.state.routes = [];
    this.state.context = {};
  }

  /**
   * Find the entry point (trigger) node
   */
  private findEntryPoint(): Node | null {
    // Find nodes without incoming edges (trigger nodes)
    const entryNodes = this.nodes.filter(node => {
      return !this.edges.some(edge => edge.target === node.id);
    });
    
    // Return the first entry node if found
    return entryNodes.length > 0 ? entryNodes[0] : null;
  }

  /**
   * Get the next node to execute based on the current state
   */
  public getNextNode(context: any = {}): string | null {
    // If no current node, initialize
    if (!this.state.currentNodeId) {
      return this.initialize();
    }
    
    // Update context
    this.state.context = { ...this.state.context, ...context };
    
    // Get the current node
    const currentNode = this.nodes.find(node => node.id === this.state.currentNodeId);
    
    if (!currentNode) {
      return null;
    }
    
    // Handle routing based on node type
    if (currentNode.type === NodeType.LANGGRAPH_CONDITIONAL || 
        currentNode.type === NodeType.CONVERSATION_ROUTER) {
      return this.handleConditionalRouting(currentNode, context);
    } else {
      return this.handleDefaultRouting(currentNode);
    }
  }

  /**
   * Handle conditional routing
   */
  private handleConditionalRouting(node: Node, context: any): string | null {
    // For conditional nodes, evaluate conditions
    if (node.type === NodeType.LANGGRAPH_CONDITIONAL) {
      const conditions = node.data.conditions || [];
      
      // Find the first matching condition
      for (const condition of conditions) {
        try {
          // Create an evaluation function
          const evaluator = new Function('context', `return ${condition.condition};`);
          
          // Evaluate the condition
          const result = evaluator(context);
          
          if (result) {
            // If condition matches, set the next node
            const nextNodeId = condition.targetNodeId;
            
            if (nextNodeId) {
              this.state.currentNodeId = nextNodeId;
              this.state.history.push(nextNodeId);
              
              return nextNodeId;
            }
          }
        } catch (error) {
          console.error(`Error evaluating condition: ${condition.condition}`, error);
        }
      }
      
      // If no condition matched, try the default route
      if (node.data.defaultNodeId) {
        this.state.currentNodeId = node.data.defaultNodeId;
        this.state.history.push(node.data.defaultNodeId);
        
        return node.data.defaultNodeId;
      }
    }
    
    // For conversation router, use the routes defined
    if (node.type === NodeType.CONVERSATION_ROUTER) {
      const routes = node.data.routes || [];
      
      // If context has a route specified, use that
      if (context.route) {
        const route = routes.find((r: any) => r.name === context.route);
        
        if (route && route.targetNodeId) {
          this.state.currentNodeId = route.targetNodeId;
          this.state.history.push(route.targetNodeId);
          
          return route.targetNodeId;
        }
      }
      
      // Otherwise, use the first route as default
      if (routes.length > 0 && routes[0].targetNodeId) {
        this.state.currentNodeId = routes[0].targetNodeId;
        this.state.history.push(routes[0].targetNodeId);
        
        return routes[0].targetNodeId;
      }
    }
    
    // Fall back to default routing if no conditional route was found
    return this.handleDefaultRouting(node);
  }

  /**
   * Handle default routing (follow edges)
   */
  private handleDefaultRouting(node: Node): string | null {
    // Find outgoing edges from this node
    const outgoingEdges = this.edges.filter(edge => edge.source === node.id);
    
    // If there are outgoing edges, follow the first one
    if (outgoingEdges.length > 0) {
      const nextNodeId = outgoingEdges[0].target;
      
      if (nextNodeId) {
        this.state.currentNodeId = nextNodeId;
        this.state.history.push(nextNodeId);
        
        return nextNodeId;
      }
    }
    
    // No next node found
    return null;
  }

  /**
   * Check if a node is a terminal node (no outgoing edges)
   */
  public isTerminalNode(nodeId: string): boolean {
    return !this.edges.some(edge => edge.source === nodeId);
  }

  /**
   * Send a routing event
   */
  public sendRoutingEvent(fromNodeId: string, toNodeId: string, data: any = {}): void {
    this.sendWebSocketEvent({
      type: 'routing_update',
      data: {
        executionId: this.executionId,
        fromNodeId,
        toNodeId,
        timestamp: new Date().toISOString(),
        ...data,
      },
    });
  }

  /**
   * Get the execution path history
   */
  public getExecutionPath(): string[] {
    return [...this.state.history];
  }
}