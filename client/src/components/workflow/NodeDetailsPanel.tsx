import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw, 
  PauseCircle, 
  StopCircle,
  Clipboard,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { ExecutionStatus } from '@shared/schema';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';

interface NodeDetailsPanelProps {
  nodeExecution: any;
  onClose?: () => void;
  isLoading?: boolean;
}

const NodeDetailsPanel: React.FC<NodeDetailsPanelProps> = ({ 
  nodeExecution, 
  onClose,
  isLoading = false
}) => {
  const { toast } = useToast();

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return format(date, 'MMM d, yyyy HH:mm:ss');
  };

  // Format duration for display
  const formatDuration = (startTime: string, endTime: string) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    
    if (durationMs <= 0) return 'N/A';
    return formatDistance(0, durationMs, { includeSeconds: true });
  };

  // Copy JSON to clipboard
  const copyToClipboard = (data: any) => {
    try {
      const text = JSON.stringify(data, null, 2);
      navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "JSON data has been copied to your clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy data to clipboard",
        variant: "destructive",
      });
    }
  };

  // Get appropriate status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case ExecutionStatus.COMPLETED:
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Completed</Badge>;
      case ExecutionStatus.FAILED:
        return <Badge className="bg-red-500"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case ExecutionStatus.RUNNING:
        return <Badge className="bg-blue-500"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Running</Badge>;
      case ExecutionStatus.PAUSED:
        return <Badge className="bg-yellow-500"><PauseCircle className="h-3 w-3 mr-1" /> Paused</Badge>;
      case ExecutionStatus.CANCELLED:
        return <Badge className="bg-orange-500"><StopCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case ExecutionStatus.QUEUED:
      default:
        return <Badge className="bg-gray-500"><Clock className="h-3 w-3 mr-1" /> Queued</Badge>;
    }
  };

  // Pretty print JSON
  const renderJson = (data: any) => {
    if (!data) return <p className="text-muted-foreground">No data available</p>;
    
    try {
      // If it's a string that looks like JSON, parse it
      if (typeof data === 'string' && (data.startsWith('{') || data.startsWith('['))) {
        data = JSON.parse(data);
      }
      
      return (
        <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            className="absolute right-0 top-0"
            onClick={() => copyToClipboard(data)}
          >
            <Clipboard className="h-4 w-4" />
          </Button>
          <pre className="bg-gray-50 p-4 rounded-md text-xs overflow-auto mt-2">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
    } catch (e) {
      // If it's not valid JSON, just display as text
      return (
        <div className="bg-gray-50 p-4 rounded-md text-xs overflow-auto whitespace-pre-wrap">
          {data.toString()}
        </div>
      );
    }
  };

  // Render loading skeleton
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Node Execution Details
            <Loader2 className="h-4 w-4 animate-spin" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-40" />
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Handle case where no node execution is selected
  if (!nodeExecution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Execution Details</CardTitle>
          <CardDescription>Select a node to view its execution details</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Node: {nodeExecution.nodeId}</span>
          {getStatusBadge(nodeExecution.status)}
        </CardTitle>
        <CardDescription>
          Started: {formatTimestamp(nodeExecution.startedAt)}
          {nodeExecution.completedAt && (
            <>
              <br />
              Completed: {formatTimestamp(nodeExecution.completedAt)}
              <br />
              Duration: {formatDuration(nodeExecution.startedAt, nodeExecution.completedAt)}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="io">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="io">Input/Output</TabsTrigger>
            <TabsTrigger value="error" disabled={!nodeExecution.error}>Error</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="io" className="space-y-4">
            <Accordion type="single" collapsible defaultValue="input">
              <AccordionItem value="input">
                <AccordionTrigger>Input</AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[200px]">
                    {renderJson(nodeExecution.input)}
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="output">
                <AccordionTrigger>Output</AccordionTrigger>
                <AccordionContent>
                  <ScrollArea className="h-[200px]">
                    {nodeExecution.status === ExecutionStatus.COMPLETED ? 
                      renderJson(nodeExecution.output) : 
                      <p className="text-muted-foreground">
                        {nodeExecution.status === ExecutionStatus.RUNNING ? 
                          "Node is still running..." : 
                          "No output available"}
                      </p>
                    }
                  </ScrollArea>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>
          
          <TabsContent value="error">
            {nodeExecution.error ? (
              <div className="border border-red-200 bg-red-50 rounded-md p-4 text-red-800">
                <h4 className="font-medium mb-2">Error Details</h4>
                <ScrollArea className="h-[200px]">
                  <pre className="text-xs overflow-auto whitespace-pre-wrap">
                    {nodeExecution.error}
                  </pre>
                </ScrollArea>
              </div>
            ) : (
              <p className="text-muted-foreground py-4">No errors reported</p>
            )}
          </TabsContent>
          
          <TabsContent value="details">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1 text-sm">
                <div className="font-medium">Node ID:</div>
                <div className="col-span-2">{nodeExecution.nodeId}</div>
                
                <div className="font-medium">Execution ID:</div>
                <div className="col-span-2">{nodeExecution.id}</div>
                
                <div className="font-medium">Status:</div>
                <div className="col-span-2">{nodeExecution.status}</div>
                
                <div className="font-medium">Started:</div>
                <div className="col-span-2">{formatTimestamp(nodeExecution.startedAt)}</div>
                
                {nodeExecution.completedAt && (
                  <>
                    <div className="font-medium">Completed:</div>
                    <div className="col-span-2">{formatTimestamp(nodeExecution.completedAt)}</div>
                    
                    <div className="font-medium">Duration:</div>
                    <div className="col-span-2">
                      {formatDuration(nodeExecution.startedAt, nodeExecution.completedAt)}
                    </div>
                  </>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {onClose && (
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default NodeDetailsPanel;