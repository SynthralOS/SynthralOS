import React from 'react';
import { useWorkflowExecution, ExecutionStatus } from '@/hooks/useWorkflowExecution';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PlayCircle,
  PauseCircle,
  StopCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';

interface WorkflowExecutionStatusProps {
  executionId: number;
}

export function WorkflowExecutionStatus({ executionId }: WorkflowExecutionStatusProps) {
  const [state, controls] = useWorkflowExecution(executionId);
  
  // Status indicator based on current status
  const getStatusIndicator = () => {
    switch (state.status) {
      case 'running':
        return <Badge className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'cancelled':
        return <Badge className="bg-orange-500"><StopCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500"><PauseCircle className="h-3 w-3 mr-1" /> Paused</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-gray-500"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    }
  };
  
  // Render loading state
  if (state.isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Workflow Execution
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardTitle>
          <CardDescription>Loading execution data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Render error state
  if (state.isError) {
    return (
      <Card className="w-full border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Execution
          </CardTitle>
          <CardDescription className="text-red-500">
            {state.errorMessage || 'Could not load execution data'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Workflow Execution #{executionId}
          {getStatusIndicator()}
        </CardTitle>
        <CardDescription>
          Progress: {state.progress}% Complete
          ({state.completedNodes.length} of {state.completedNodes.length + state.currentNodes.length} nodes)
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <Progress value={state.progress} className="h-2" />
        
        {/* Currently Processing Nodes */}
        {state.currentNodes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Currently Processing:</h4>
            <div className="flex flex-wrap gap-2">
              {state.currentNodes.map(nodeId => (
                <Badge key={nodeId} variant="outline" className="bg-blue-100">
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  {nodeId}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Execution Logs */}
        <div>
          <h4 className="text-sm font-medium mb-2">Recent Logs:</h4>
          <ScrollArea className="h-32 w-full rounded border p-2 bg-muted/20">
            {state.recentLogs.length > 0 ? (
              <div className="space-y-1">
                {state.recentLogs.map((log, index) => (
                  <p key={index} className="text-xs font-mono">
                    {log}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No logs available</p>
            )}
          </ScrollArea>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {/* Control Buttons */}
        <div className="flex space-x-2">
          {state.status === 'paused' && (
            <Button 
              onClick={controls.resumeExecution}
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              Resume
            </Button>
          )}
          
          {state.status === 'running' && (
            <Button 
              onClick={controls.pauseExecution}
              variant="outline"
              className="flex items-center"
              size="sm"
            >
              <PauseCircle className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          
          {(state.status === 'running' || state.status === 'paused') && (
            <Button 
              onClick={controls.cancelExecution}
              variant="destructive"
              className="flex items-center"
              size="sm"
            >
              <StopCircle className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
        
        {/* View Details Link */}
        <Button 
          variant="secondary"
          size="sm"
          asChild
        >
          <a href={`/workflow-executions/${executionId}`}>
            View Details
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}