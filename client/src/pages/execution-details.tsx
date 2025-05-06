import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  StopCircle, 
  PauseCircle, 
  RefreshCw, 
  ArrowLeft, 
  Clock, 
  Loader2,
  Play,
  Terminal,
  LayoutDashboard,
  Activity
} from 'lucide-react';
import { AppLayout } from '@/layouts/AppLayout';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useWorkflowExecution } from '@/hooks/useWorkflowExecution';
import { ExecutionStatus } from '@shared/schema';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import WorkflowExecutionGraph from '@/components/workflow/WorkflowExecutionGraph';
import ExecutionTimeline from '@/components/workflow/ExecutionTimeline';
import LogViewer from '@/components/workflow/LogViewer';
import NodeDetailsPanel from '@/components/workflow/NodeDetailsPanel';

export default function ExecutionDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const executionId = parseInt(id);
  const { toast } = useToast();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  // Use the hook to get execution state and controls
  const [state, controls] = useWorkflowExecution(executionId);
  
  // Fetch execution details
  const { data: details, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ['/api/executions', executionId, 'details'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/executions/${executionId}/details`);
      return response.json();
    },
    refetchInterval: state.isActive ? 5000 : false,
  });

  // Format time duration from milliseconds
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    return `${hours > 0 ? hours + 'h ' : ''}${minutes % 60}m ${seconds % 60}s`;
  };

  // Get execution duration
  const getDuration = () => {
    if (!details?.execution) return '';
    
    const start = new Date(details.execution.startedAt).getTime();
    const end = details.execution.completedAt 
      ? new Date(details.execution.completedAt).getTime() 
      : Date.now();
      
    return formatDuration(end - start);
  };

  // Handle pause/resume/cancel actions
  const handlePauseExecution = async () => {
    try {
      await controls.pauseExecution();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to pause execution. Please try again.'
      });
    }
  };

  const handleResumeExecution = async () => {
    try {
      await controls.resumeExecution();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to resume execution. Please try again.'
      });
    }
  };

  const handleCancelExecution = async () => {
    try {
      await controls.cancelExecution();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel execution. Please try again.'
      });
    }
  };

  // Get status badge
  const getStatusBadge = (status: ExecutionStatus) => {
    switch (status) {
      case ExecutionStatus.RUNNING:
        return <Badge className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      case ExecutionStatus.COMPLETED:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case ExecutionStatus.FAILED:
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case ExecutionStatus.CANCELLED:
        return <Badge className="bg-orange-500"><StopCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case ExecutionStatus.PAUSED:
        return <Badge className="bg-yellow-500"><PauseCircle className="h-3 w-3 mr-1" /> Paused</Badge>;
      case ExecutionStatus.QUEUED:
      default:
        return <Badge className="bg-gray-500"><Clock className="h-3 w-3 mr-1" /> Queued</Badge>;
    }
  };

  // Render loading state
  if (isLoadingDetails || state.isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center mb-6">
            <Link href="/executions" className="mr-2">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Executions
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Workflow Execution #{executionId}</h1>
              <p className="text-muted-foreground">Loading execution details...</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Loading Execution Details</CardTitle>
              <CardDescription>Please wait while we load the execution details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
                <Skeleton className="h-[400px] w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Render error state
  if (detailsError || state.isError) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center mb-6">
            <Link href="/executions" className="mr-2">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Executions
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">Workflow Execution #{executionId}</h1>
              <p className="text-muted-foreground">Error loading execution details</p>
            </div>
          </div>
          
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {state.errorMessage || detailsError instanceof Error ? detailsError.message : 'Unknown error occurred'}
            </AlertDescription>
          </Alert>
          
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Extract execution data
  const { execution, logs, nodeExecutions, realTimeStatus } = details || {};
  
  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
          <div className="mb-4 sm:mb-0">
            <Link href="/executions" className="inline-block mb-2">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Executions
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Workflow: {execution?.workflowName}</h1>
            <p className="text-muted-foreground">Execution #{executionId}</p>
          </div>
          
          <div>
            {getStatusBadge(state.status)}
            
            {/* Execution controls */}
            <div className="flex mt-2 space-x-2">
              {state.status === ExecutionStatus.RUNNING && (
                <Button onClick={handlePauseExecution} variant="outline" size="sm">
                  <PauseCircle className="h-4 w-4 mr-1" /> Pause
                </Button>
              )}
              
              {state.status === ExecutionStatus.PAUSED && (
                <Button onClick={handleResumeExecution} variant="outline" size="sm">
                  <Play className="h-4 w-4 mr-1" /> Resume
                </Button>
              )}
              
              {[ExecutionStatus.RUNNING, ExecutionStatus.PAUSED, ExecutionStatus.QUEUED].includes(state.status) && (
                <Button onClick={handleCancelExecution} variant="destructive" size="sm">
                  <StopCircle className="h-4 w-4 mr-1" /> Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Execution metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Status</p>
                <div className="mt-2">{getStatusBadge(state.status)}</div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Started</p>
                <p className="font-medium mt-2">{format(new Date(execution?.startedAt), 'MMM dd, yyyy HH:mm:ss')}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Duration</p>
                <p className="font-medium mt-2">{getDuration()}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">Progress</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div
                    className="bg-primary h-2.5 rounded-full"
                    style={{ width: `${state.progress}%` }}
                  ></div>
                </div>
                <p className="text-xs mt-1">{state.progress}% complete</p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {execution?.error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Execution Failed</AlertTitle>
            <AlertDescription>{execution.error}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="graph" className="mb-6">
          <TabsList>
            <TabsTrigger value="graph">
              <LayoutDashboard className="h-4 w-4 mr-2" /> Workflow Graph
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Activity className="h-4 w-4 mr-2" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="logs">
              <Terminal className="h-4 w-4 mr-2" /> Logs
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="graph" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                {nodeExecutions?.length > 0 ? (
                  <div className="flex flex-col lg:flex-row">
                    <div className="flex-1 min-h-[500px]">
                      <WorkflowExecutionGraph
                        workflow={details?.workflow}
                        nodeExecutions={nodeExecutions || []}
                        height="500px"
                        onNodeClick={setSelectedNodeId}
                      />
                    </div>
                    
                    {selectedNodeId && (
                      <div className="w-full lg:w-1/3 mt-4 lg:mt-0 lg:ml-4">
                        <NodeDetailsPanel
                          nodeExecution={nodeExecutions.find(node => node.nodeId === selectedNodeId)}
                          onClose={() => setSelectedNodeId(null)}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Terminal className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-medium">No node executions available</h3>
                    <p className="text-muted-foreground mt-2">
                      This workflow hasn't started executing nodes yet
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <ExecutionTimeline
                  execution={execution}
                  nodeExecutions={nodeExecutions || []}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <LogViewer logs={logs || []} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Execution Results (if completed) */}
        {state.status === ExecutionStatus.COMPLETED && execution?.result && (
          <Card>
            <CardHeader>
              <CardTitle>Execution Results</CardTitle>
              <CardDescription>Final output from the workflow execution</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[300px]">
                <code>{JSON.stringify(execution.result, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}