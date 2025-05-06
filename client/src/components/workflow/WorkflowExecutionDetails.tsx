import React, { useState } from 'react';
import { useWorkflowExecution, ExecutionStatus } from '@/hooks/useWorkflowExecution';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2,
  ArrowLeft,
  Eye,
  Terminal,
  Activity,
  Info
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface WorkflowExecutionDetailsProps {
  executionId: number;
  onBack?: () => void;
}

export function WorkflowExecutionDetails({ executionId, onBack }: WorkflowExecutionDetailsProps) {
  const [state, controls] = useWorkflowExecution(executionId);
  const [selectedTab, setSelectedTab] = useState('overview');
  
  // Fetch workflow details to show node connections and full structure
  const { data: executionDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/executions', executionId, 'details'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/executions/${executionId}/details`);
      return response.json();
    }
  });
  
  const getStatusBadge = (status: string) => {
    switch (status) {
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
  
  // Format timestamp
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  // Determine if we're still loading data
  const isLoading = state.isLoading || isLoadingDetails;
  
  // Render loading state
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Workflow Execution Details
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
        {onBack && (
          <CardFooter>
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }
  
  // Organize node results
  const nodeResultEntries = Object.entries(state.nodeResults);
  
  // Calculate execution duration
  const startTime = executionDetails?.execution?.startedAt 
    ? new Date(executionDetails.execution.startedAt) 
    : null;
  const endTime = executionDetails?.execution?.completedAt 
    ? new Date(executionDetails.execution.completedAt) 
    : null;
  
  let duration = 'In progress';
  if (startTime && endTime) {
    const durationMs = endTime.getTime() - startTime.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      duration = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      duration = `${minutes}m ${seconds % 60}s`;
    } else {
      duration = `${seconds}s`;
    }
  } else if (startTime) {
    const durationMs = Date.now() - startTime.getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      duration = `${hours}h ${minutes % 60}m ${seconds % 60}s (in progress)`;
    } else if (minutes > 0) {
      duration = `${minutes}m ${seconds % 60}s (in progress)`;
    } else {
      duration = `${seconds}s (in progress)`;
    }
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            {onBack && (
              <Button onClick={onBack} variant="outline" size="icon" className="mr-2">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            Execution #{executionId}
          </CardTitle>
          {getStatusBadge(state.status)}
        </div>
        <CardDescription>
          Workflow: {executionDetails?.workflow?.name || 'Unknown'}
          {executionDetails?.workflow?.description && ` - ${executionDetails.workflow.description}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Tabs 
          defaultValue="overview" 
          value={selectedTab} 
          onValueChange={setSelectedTab}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="overview" className="flex items-center">
              <Info className="h-4 w-4 mr-2" /> Overview
            </TabsTrigger>
            <TabsTrigger value="nodes" className="flex items-center">
              <Activity className="h-4 w-4 mr-2" /> Nodes
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center">
              <Terminal className="h-4 w-4 mr-2" /> Logs
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center">
              <Eye className="h-4 w-4 mr-2" /> Results
            </TabsTrigger>
          </TabsList>
          
          {/* Overview tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium">Start Time</h3>
                <p className="text-sm text-muted-foreground">
                  {startTime ? formatTime(startTime.toISOString()) : 'Not started'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">End Time</h3>
                <p className="text-sm text-muted-foreground">
                  {endTime ? formatTime(endTime.toISOString()) : 'In progress'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Duration</h3>
                <p className="text-sm text-muted-foreground">{duration}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Progress</h3>
                <p className="text-sm text-muted-foreground">
                  {state.progress}% ({state.completedNodes.length} of {state.completedNodes.length + state.currentNodes.length} nodes)
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-2">Currently Processing</h3>
              {state.currentNodes.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {state.currentNodes.map(nodeId => (
                    <Badge key={nodeId} variant="outline" className="bg-blue-100">
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      {nodeId}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No nodes currently processing</p>
              )}
            </div>
          </TabsContent>
          
          {/* Nodes tab */}
          <TabsContent value="nodes">
            <Table>
              <TableCaption>Nodes in this workflow execution</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Node ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodeResultEntries.length > 0 ? (
                  nodeResultEntries.map(([nodeId, result]) => {
                    // Get node type from execution details if available
                    const nodeType = executionDetails?.result?.nodeResults?.[nodeId]?.type || 'Unknown';
                    
                    return (
                      <TableRow key={nodeId}>
                        <TableCell className="font-medium">{nodeId}</TableCell>
                        <TableCell>{nodeType}</TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell>{result.startTime ? formatTime(result.startTime) : '-'}</TableCell>
                        <TableCell>{result.endTime ? formatTime(result.endTime) : '-'}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No node execution data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          
          {/* Logs tab */}
          <TabsContent value="logs">
            <ScrollArea className="h-[400px] w-full rounded border p-4 bg-muted/20">
              {executionDetails?.logs && executionDetails.logs.length > 0 ? (
                <div className="space-y-1">
                  {executionDetails.logs.map((log: string, index: number) => (
                    <p key={index} className="text-xs font-mono">
                      {log}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-4">No logs available</p>
              )}
            </ScrollArea>
          </TabsContent>
          
          {/* Results tab */}
          <TabsContent value="results">
            <Accordion type="single" collapsible className="w-full">
              {nodeResultEntries.length > 0 ? (
                nodeResultEntries
                  .filter(([_, result]) => result.status === 'completed')
                  .map(([nodeId, result]) => (
                    <AccordionItem value={nodeId} key={nodeId}>
                      <AccordionTrigger className="hover:bg-muted/50 px-4">
                        <div className="flex items-center">
                          <span className="font-medium">{nodeId}</span>
                          {result.status === 'completed' && (
                            <CheckCircle className="h-4 w-4 ml-2 text-green-500" />
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pt-2">
                        <div className="space-y-2">
                          <div>
                            <h4 className="text-sm font-medium">Input</h4>
                            <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-[100px]">
                              {result.input ? JSON.stringify(result.input, null, 2) : 'No input data'}
                            </pre>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium">Output</h4>
                            <pre className="text-xs bg-muted/30 p-2 rounded overflow-auto max-h-[100px]">
                              {result.output ? JSON.stringify(result.output, null, 2) : 'No output data'}
                            </pre>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))
              ) : (
                <p className="text-sm text-muted-foreground italic p-4">No node results available</p>
              )}
            </Accordion>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
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
        
        <Button 
          variant="outline"
          size="sm"
          asChild
        >
          <a href={`/workflows/${executionDetails?.workflow?.id}`}>
            Back to Workflow
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}