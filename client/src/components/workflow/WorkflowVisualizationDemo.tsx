import React, { useState, useEffect } from 'react';
import VisualizedWorkflowCanvas from './VisualizedWorkflowCanvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlayCircle, PauseCircle, StopCircle, Repeat } from 'lucide-react';
import { ExecutionStatus } from '@/lib/workflow';

// Demo workflow with some predefined nodes and edges
const demoNodes = [
  {
    id: 'trigger',
    type: 'default',
    position: { x: 100, y: 200 },
    data: { 
      label: 'Start Trigger',
      type: 'manual_trigger',
      description: 'Manually start the workflow',
      status: 'idle'
    },
  },
  {
    id: 'process1',
    type: 'default',
    position: { x: 350, y: 100 },
    data: { 
      label: 'Process Data',
      type: 'transform',
      description: 'Transform incoming data',
      status: 'idle'
    },
  },
  {
    id: 'process2',
    type: 'default',
    position: { x: 350, y: 300 },
    data: { 
      label: 'AI Analysis',
      type: 'text_generation',
      description: 'Analyze with AI',
      status: 'idle'
    },
  },
  {
    id: 'merge',
    type: 'default',
    position: { x: 600, y: 200 },
    data: { 
      label: 'Merge Results',
      type: 'merge',
      description: 'Combine processed data',
      status: 'idle'
    },
  },
  {
    id: 'output',
    type: 'default',
    position: { x: 850, y: 200 },
    data: { 
      label: 'Save Results',
      type: 'file_output',
      description: 'Save to output file',
      status: 'idle'
    },
  },
];

const demoEdges = [
  {
    id: 'e1-2',
    source: 'trigger',
    target: 'process1',
    type: 'default',
    data: { status: 'default' },
  },
  {
    id: 'e1-3',
    source: 'trigger',
    target: 'process2',
    type: 'default',
    data: { status: 'default' },
  },
  {
    id: 'e2-4',
    source: 'process1',
    target: 'merge',
    type: 'default',
    data: { status: 'default' },
  },
  {
    id: 'e3-4',
    source: 'process2',
    target: 'merge',
    type: 'default',
    data: { status: 'default' },
  },
  {
    id: 'e4-5',
    source: 'merge',
    target: 'output',
    type: 'default',
    data: { status: 'default' },
  },
];

// Used to simulate websocket events
interface SimulatedEvent {
  type: string;
  data: any;
}

export default function WorkflowVisualizationDemo() {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [demoWs, setDemoWs] = useState<any>(null);
  
  // Simulate a WebSocket for demo purposes
  useEffect(() => {
    if (!window.demoWebSocket) {
      // Create a mock WebSocket that we'll use to push events
      window.demoWebSocket = {
        listeners: [],
        addListener: function(callback: (event: SimulatedEvent) => void) {
          this.listeners.push(callback);
        },
        removeListener: function(callback: (event: SimulatedEvent) => void) {
          this.listeners = this.listeners.filter(l => l !== callback);
        },
        emit: function(event: SimulatedEvent) {
          this.listeners.forEach(listener => listener(event));
        }
      };
    }
    
    setDemoWs(window.demoWebSocket);
    
    // Cleanup
    return () => {
      if (demoWs) {
        demoWs.listeners = [];
      }
    };
  }, []);
  
  // Simulate a workflow execution
  const simulateExecution = () => {
    if (!demoWs) return;
    
    setIsRunning(true);
    setIsPaused(false);
    
    // Emit execution started event
    demoWs.emit({
      type: 'execution_started',
      data: { executionId: 1 }
    });
    
    // Start the trigger node
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'trigger', 
          status: 'running',
          message: 'Starting workflow execution...'
        }
      });
    }, 500);
    
    // Complete the trigger node and send data to process1
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'trigger', 
          status: 'completed',
          message: 'Workflow triggered successfully' 
        }
      });
      
      // Data transfer to process1
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'trigger', 
          targetNodeId: 'process1',
          status: 'started',
          data: { message: 'Sending data to Process 1' }
        }
      });
      
      // Data transfer to process2
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'trigger', 
          targetNodeId: 'process2',
          status: 'started',
          data: { message: 'Sending data to Process 2' }
        }
      });
    }, 2000);
    
    // Start process1
    setTimeout(() => {
      // Complete data transfer
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'trigger', 
          targetNodeId: 'process1',
          status: 'completed'
        }
      });
      
      // Start node execution
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'process1', 
          status: 'running',
          message: 'Processing data...' 
        }
      });
    }, 3000);
    
    // Start process2
    setTimeout(() => {
      // Complete data transfer
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'trigger', 
          targetNodeId: 'process2',
          status: 'completed'
        }
      });
      
      // Start node execution
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'process2', 
          status: 'running',
          message: 'Running AI analysis...' 
        }
      });
    }, 3500);
    
    // Complete process1
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'process1', 
          status: 'completed',
          message: 'Data processed successfully' 
        }
      });
      
      // Data transfer to merge
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'process1', 
          targetNodeId: 'merge',
          status: 'started',
          data: { message: 'Sending processed data to merge node' }
        }
      });
    }, 5000);
    
    // Complete process2
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'process2', 
          status: 'completed',
          message: 'AI analysis completed' 
        }
      });
      
      // Data transfer to merge
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'process2', 
          targetNodeId: 'merge',
          status: 'started',
          data: { message: 'Sending AI results to merge node' }
        }
      });
    }, 7000);
    
    // Complete data transfers to merge
    setTimeout(() => {
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'process1', 
          targetNodeId: 'merge',
          status: 'completed'
        }
      });
      
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'process2', 
          targetNodeId: 'merge',
          status: 'completed'
        }
      });
      
      // Start merge node
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'merge', 
          status: 'running',
          message: 'Merging results...' 
        }
      });
    }, 8000);
    
    // Complete merge node
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'merge', 
          status: 'completed',
          message: 'Results merged successfully' 
        }
      });
      
      // Data transfer to output
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'merge', 
          targetNodeId: 'output',
          status: 'started',
          data: { message: 'Sending merged data to output' }
        }
      });
    }, 10000);
    
    // Complete data transfer to output
    setTimeout(() => {
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId: 'merge', 
          targetNodeId: 'output',
          status: 'completed'
        }
      });
      
      // Start output node
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'output', 
          status: 'running',
          message: 'Saving results to file...' 
        }
      });
    }, 11000);
    
    // Complete output node and workflow
    setTimeout(() => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: 'output', 
          status: 'completed',
          message: 'Results saved successfully' 
        }
      });
      
      // Complete the workflow
      demoWs.emit({
        type: 'execution_completed',
        data: { 
          executionId: 1,
          result: { message: 'Workflow completed successfully' }
        }
      });
      
      setIsRunning(false);
    }, 13000);
  };
  
  // Simulate pausing the workflow
  const simulatePause = () => {
    if (!demoWs) return;
    if (!isRunning) return;
    
    setIsPaused(true);
    
    // Emit execution paused event
    demoWs.emit({
      type: 'execution_paused',
      data: { executionId: 1 }
    });
    
    // Pause any running nodes
    demoNodes.forEach(node => {
      if (node.data.status === 'running') {
        demoWs.emit({
          type: 'node_execution_update',
          data: { 
            nodeId: node.id, 
            status: 'paused'
          }
        });
      }
    });
  };
  
  // Simulate resuming the workflow
  const simulateResume = () => {
    if (!demoWs) return;
    if (!isPaused) return;
    
    setIsPaused(false);
    setIsRunning(true);
    
    // Emit execution resumed event
    demoWs.emit({
      type: 'execution_resumed',
      data: { executionId: 1 }
    });
    
    // Resume any paused nodes
    demoNodes.forEach(node => {
      if (node.data.status === 'paused') {
        demoWs.emit({
          type: 'node_execution_update',
          data: { 
            nodeId: node.id, 
            status: 'running'
          }
        });
      }
    });
  };
  
  // Simulate stopping the workflow
  const simulateStop = () => {
    if (!demoWs) return;
    if (!isRunning && !isPaused) return;
    
    setIsRunning(false);
    setIsPaused(false);
    
    // Emit execution cancelled event
    demoWs.emit({
      type: 'execution_cancelled',
      data: { executionId: 1 }
    });
  };
  
  // Simulate resetting the workflow
  const simulateReset = () => {
    if (!demoWs) return;
    
    setIsRunning(false);
    setIsPaused(false);
    
    // Reset all nodes to idle
    demoNodes.forEach(node => {
      demoWs.emit({
        type: 'node_execution_update',
        data: { 
          nodeId: node.id, 
          status: 'idle'
        }
      });
    });
    
    // Reset all edges to default
    demoEdges.forEach(edge => {
      const sourceNodeId = edge.source;
      const targetNodeId = edge.target;
      
      demoWs.emit({
        type: 'routing_update',
        data: { 
          sourceNodeId, 
          targetNodeId,
          status: 'default'
        }
      });
    });
  };
  
  // Monkey patch the WebSocket connection in the VisualizedWorkflowCanvas
  // This is just for the demo - in a real app, it would use real WebSockets
  useEffect(() => {
    if (demoWs) {
      // Override the global WebSocket constructor for the demo
      const originalWebSocket = window.WebSocket;
      window.WebSocket = function(url: string) {
        // Return a mock WebSocket object that uses our demo WebSocket
        this.url = url;
        this.readyState = WebSocket.OPEN;
        this.send = function(data: string) {
          console.log('Mock WebSocket message sent:', data);
        };
        this.close = function() {
          console.log('Mock WebSocket closed');
        };
        
        // Forward events from our demo WebSocket
        demoWs.addListener((event: SimulatedEvent) => {
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(event) });
          }
        });
        
        // Call onopen callback
        setTimeout(() => {
          if (this.onopen) {
            this.onopen({});
          }
        }, 100);
      };
      
      window.WebSocket.OPEN = originalWebSocket.OPEN;
      window.WebSocket.CLOSED = originalWebSocket.CLOSED;
      window.WebSocket.CLOSING = originalWebSocket.CLOSING;
      window.WebSocket.CONNECTING = originalWebSocket.CONNECTING;
      
      // Restore the original WebSocket when component unmounts
      return () => {
        window.WebSocket = originalWebSocket;
      };
    }
  }, [demoWs]);
  
  return (
    <div className="flex flex-col h-full">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Workflow Visualization Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <Button 
              variant={isRunning ? "secondary" : "default"}
              onClick={simulateExecution}
              disabled={isRunning}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Simulate Execution
            </Button>
            
            <Button 
              variant="outline"
              onClick={simulatePause}
              disabled={!isRunning || isPaused}
            >
              <PauseCircle className="mr-2 h-4 w-4" />
              Pause
            </Button>
            
            <Button 
              variant="outline"
              onClick={simulateResume}
              disabled={!isPaused}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Resume
            </Button>
            
            <Button 
              variant="outline"
              onClick={simulateStop}
              disabled={!isRunning && !isPaused}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
            
            <Button 
              variant="secondary"
              onClick={simulateReset}
            >
              <Repeat className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex-1">
        <VisualizedWorkflowCanvas 
          initialNodes={demoNodes}
          initialEdges={demoEdges}
          workflowId={1} // Fake ID for demo
        />
      </div>
    </div>
  );
}