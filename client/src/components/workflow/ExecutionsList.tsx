import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CheckCircle,
  XCircle,
  StopCircle,
  PauseCircle,
  RefreshCw,
  Clock,
  Loader2,
  ArrowRight,
  AlertCircle
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
import { ExecutionStatus } from '@/hooks/useWorkflowExecution';
import { Link } from 'wouter';

interface ExecutionsListProps {
  workflowId: number;
}

export function ExecutionsList({ workflowId }: ExecutionsListProps) {
  // Fetch workflow executions
  const { 
    data: executions, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['/api/workflows', workflowId, 'executions'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/workflows/${workflowId}/executions`);
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds to get updates
  });
  
  // Status badge component
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
  
  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Executions
            <Loader2 className="h-5 w-5 animate-spin" />
          </CardTitle>
          <CardDescription>Loading execution history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (isError) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Executions
          </CardTitle>
          <CardDescription className="text-red-500">
            {error ? String(error) : 'Could not load execution history'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Executions</CardTitle>
        <CardDescription>History of workflow executions</CardDescription>
      </CardHeader>
      <CardContent>
        {executions && executions.length > 0 ? (
          <Table>
            <TableCaption>Showing last {executions.length} executions</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions.map((execution: any) => (
                <TableRow key={execution.id}>
                  <TableCell className="font-medium">{execution.id}</TableCell>
                  <TableCell>{getStatusBadge(execution.status)}</TableCell>
                  <TableCell>{formatTime(execution.startedAt)}</TableCell>
                  <TableCell>
                    {execution.completedAt ? formatTime(execution.completedAt) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      asChild
                    >
                      <Link to={`/workflow-executions/${execution.id}`}>
                        View <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No executions found for this workflow</p>
            <p className="text-sm text-muted-foreground mt-1">
              Execute the workflow to see results here
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}