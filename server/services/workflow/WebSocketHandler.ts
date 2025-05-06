import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { v4 as uuidv4 } from 'uuid';

/**
 * WebSocket message type for workflow execution
 */
interface WebSocketEvent {
  type: 'execution_update' | 'subscribe' | 'unsubscribe';
  executionId?: string;
  status?: string;
  nodeId?: string;
  nodeStatus?: string;
  output?: any;
  error?: string;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Workflow WebSocket handler
 * Manages WebSocket connections for real-time workflow execution updates
 */
class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, { ws: WebSocket, subscriptions: Set<string> }> = new Map();
  private executionSubscribers: Map<string, Set<string>> = new Map();
  
  /**
   * Initialize the WebSocket server
   * @param server - HTTP server instance
   */
  initialize(server: Server): void {
    try {
      // Create WebSocket server on the specific path with enhanced options
      this.wss = new WebSocketServer({ 
        server, 
        path: '/ws',
        perMessageDeflate: false,
        clientTracking: true,
        // Explicitly handle CORS for WebSockets
        // @ts-ignore - The WebSocketServer type definition doesn't match runtime behavior
        handleProtocols: (protocols: string[] | Set<string> | undefined, request) => {
          // Accept first protocol or subprotocol if any are passed, otherwise accept connection without protocol
          if (!protocols) return true;
          
          if (Array.isArray(protocols)) {
            return protocols.length > 0 ? protocols[0] : true;
          }
          
          if (protocols instanceof Set && protocols.size > 0) {
            return Array.from(protocols)[0];
          }
          
          return true;
        },
        // More permissive client verification
        verifyClient: ({ origin, req, secure }, callback) => {
          console.log(`[websocket] New client attempting to connect from origin: ${origin || 'unknown'}`);
          // Accept any connection regardless of origin
          callback(true);
        }
      });
      
      console.log('[websocket] WebSocket server initialized for workflow executions');
      
      // Server error handler
      this.wss.on('error', (error) => {
        console.error('[websocket] Server error:', error);
      });
      
      // Setup connection handler
      this.wss.on('connection', (ws: WebSocket, req: any) => {
        const clientId = uuidv4();
        
        console.log(`[websocket] Client connected: ${clientId} from ${req.headers.origin || 'unknown'}`);
        
        // Send an immediate welcome message to confirm the connection
        try {
          ws.send(JSON.stringify({
            type: 'connection_established',
            message: 'WebSocket connection established',
            clientId
          }));
        } catch (err) {
          console.error(`[websocket] Error sending welcome message:`, err);
        }
        
        // Store client with empty subscriptions
        this.clients.set(clientId, {
          ws,
          subscriptions: new Set()
        });
        
        // Handle messages from client with better error handling
        ws.on('message', (message: any) => {
          console.log(`[websocket] Received message from client ${clientId}:`, message.toString());
          
          try {
            // Parse message safely
            const messageStr = message.toString();
            const data = JSON.parse(messageStr) as WebSocketEvent;
            
            if (data.type === 'subscribe' && data.executionId) {
              this.subscribeClient(clientId, data.executionId);
            } else if (data.type === 'unsubscribe' && data.executionId) {
              this.unsubscribeClient(clientId, data.executionId);
            } else {
              console.log(`[websocket] Unhandled message type: ${data.type}`);
            }
          } catch (error) {
            console.error('[websocket] Error processing message:', error);
            try {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Error processing message',
                error: error instanceof Error ? error.message : 'Unknown error'
              }));
            } catch (sendError) {
              console.error('[websocket] Error sending error response:', sendError);
            }
          }
        });
        
        // Handle client disconnect
        ws.on('close', (code, reason) => {
          this.removeClient(clientId);
          console.log(`[websocket] Client disconnected: ${clientId}, code: ${code}, reason: ${reason || 'no reason'}`);
        });
        
        // Handle errors
        ws.on('error', (error) => {
          console.error(`[websocket] WebSocket error for client ${clientId}:`, error);
        });
      });
    } catch (error) {
      console.error('[websocket] Failed to initialize WebSocket server:', error);
    }
  }
  
  /**
   * Subscribe a client to execution updates
   * @param clientId - Client ID
   * @param executionId - Execution ID to subscribe to
   */
  private subscribeClient(clientId: string, executionId: string): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      console.warn(`[websocket] Cannot subscribe non-existent client: ${clientId}`);
      return;
    }
    
    // Add execution to client's subscriptions
    client.subscriptions.add(executionId);
    
    // Add client to execution's subscribers
    let subscribers = this.executionSubscribers.get(executionId);
    
    if (!subscribers) {
      subscribers = new Set<string>();
      this.executionSubscribers.set(executionId, subscribers);
    }
    
    subscribers.add(clientId);
    
    console.log(`[websocket] Client ${clientId} subscribed to execution ${executionId}`);
  }
  
  /**
   * Unsubscribe a client from execution updates
   * @param clientId - Client ID
   * @param executionId - Execution ID to unsubscribe from
   */
  private unsubscribeClient(clientId: string, executionId: string): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return;
    }
    
    // Remove execution from client's subscriptions
    client.subscriptions.delete(executionId);
    
    // Remove client from execution's subscribers
    const subscribers = this.executionSubscribers.get(executionId);
    
    if (subscribers) {
      subscribers.delete(clientId);
      
      if (subscribers.size === 0) {
        this.executionSubscribers.delete(executionId);
      }
    }
    
    console.log(`[websocket] Client ${clientId} unsubscribed from execution ${executionId}`);
  }
  
  /**
   * Remove a client and clean up all subscriptions
   * @param clientId - Client ID to remove
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    
    if (!client) {
      return;
    }
    
    // Remove client from all execution subscribers
    // Convert Set to Array to avoid compatibility issues with --downlevelIteration
    Array.from(client.subscriptions).forEach(executionId => {
      const subscribers = this.executionSubscribers.get(executionId);
      
      if (subscribers) {
        subscribers.delete(clientId);
        
        if (subscribers.size === 0) {
          this.executionSubscribers.delete(executionId);
        }
      }
    });
    
    // Remove client
    this.clients.delete(clientId);
  }
  
  /**
   * Send an event to all clients subscribed to an execution
   * @param executionId - Execution ID
   * @param event - Event data to send
   */
  sendExecutionEvent(executionId: string, event: Omit<WebSocketEvent, 'type'>): void {
    const subscribers = this.executionSubscribers.get(executionId);
    
    if (!subscribers || subscribers.size === 0) {
      return;
    }
    
    const fullEvent: WebSocketEvent = {
      type: 'execution_update',
      executionId,
      timestamp: new Date().toISOString(),
      ...event
    };
    
    const message = JSON.stringify(fullEvent);
    
    // Send to all subscribed clients
    // Convert Set to Array to avoid compatibility issues with --downlevelIteration
    Array.from(subscribers).forEach(clientId => {
      const client = this.clients.get(clientId);
      
      if (client && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(message);
        } catch (error) {
          console.error(`[websocket] Error sending message to client ${clientId}:`, error);
        }
      }
    });
  }
  
  /**
   * Check if the WebSocket server is initialized
   */
  isInitialized(): boolean {
    return this.wss !== null;
  }
  
  /**
   * Shutdown the WebSocket server
   */
  shutdown(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    
    this.clients.clear();
    this.executionSubscribers.clear();
  }
}

// Singleton instance
const webSocketHandler = new WebSocketHandler();
export default webSocketHandler;
export { WebSocketEvent };