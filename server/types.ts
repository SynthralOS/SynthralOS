/**
 * Type definitions for the server components
 */

import { ExecutionStatus } from '@/lib/workflow';

// WebSocket event types
export type WebSocketEvent = {
  type: 
    // Workflow execution events
    | 'execution_started' 
    | 'execution_completed' 
    | 'execution_failed'
    | 'execution_paused'
    | 'execution_resumed'
    | 'execution_cancelled'
    // Node execution events
    | 'node_execution_update'
    // Routing events
    | 'routing_update'
    // LangGraph specific events
    | 'langgraph_state_update'
    | 'langgraph_memory_update'
    | 'langgraph_agent_message'
    | 'langgraph_tool_execution'
    // General events
    | 'status_update'
    | 'error'
    | 'log';
  data: any;
};

// Node execution event data
export type NodeExecutionEvent = {
  executionId: number;
  nodeId: string;
  status: ExecutionStatus;
  timestamp: string;
  input?: any;
  output?: any;
  error?: string;
};

// Routing event data
export type RoutingEvent = {
  executionId: number;
  fromNodeId: string;
  toNodeId: string;
  timestamp: string;
  condition?: string;
};

// LangGraph state update event data
export type LangGraphStateEvent = {
  executionId: number;
  timestamp: string;
  state: any;
};

// LangGraph memory update event data
export type LangGraphMemoryEvent = {
  executionId: number;
  memoryId: string;
  timestamp: string;
  memory: any;
};

// LangGraph agent message event data
export type LangGraphAgentMessageEvent = {
  executionId: number;
  agentId: string;
  timestamp: string;
  message: {
    role: string;
    content: string;
  };
};

// LangGraph tool execution event data
export type LangGraphToolExecutionEvent = {
  executionId: number;
  toolId: string;
  timestamp: string;
  input: any;
  output: any;
  error?: string;
};

// Extend the Express session to include custom properties
declare module 'express-session' {
  interface Session {
    oidcState?: string;
    oidcNonce?: string;
    oidcProviderId?: number;
    oidcCodeVerifier?: string;
    userId?: number;
    username?: string;
    email?: string;
  }
}