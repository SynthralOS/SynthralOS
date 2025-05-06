import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  CheckCircle,
  XCircle,
  StopCircle,
  PauseCircle,
  RefreshCw,
  Clock,
  Loader2,
  ArrowRight,
  Search,
  Filter,
  CalendarIcon
} from 'lucide-react';
import { AppLayout } from '@/layouts/AppLayout';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { ExecutionStatus } from '@shared/schema';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface WorkflowExecution {
  id: number;
  workflowId: number;
  workflowName: string;
  status: ExecutionStatus;
  startedAt: string;
  completedAt: string | null;
  progress: number;
  triggeredBy: {
    id: number;
    username: string;
  };
}

interface ExecutionsFilters {
  status: string | null;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  search: string;
}

export default function ExecutionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ExecutionsFilters>({
    status: null,
    dateRange: {
      from: null,
      to: null
    },
    search: ''
  });
  const queryClient = useQueryClient();
  
  // Set up real-time updates for active executions
  useEffect(() => {
    // Create WebSocket connection for real-time updates
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    socket.onopen = () => {
      console.log('WebSocket connection established for executions');
    };
    
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        // Handle execution updates
        if (
          message.type === 'execution_started' || 
          message.type === 'execution_completed' || 
          message.type === 'execution_failed' ||
          message.type === 'execution_paused' ||
          message.type === 'execution_resumed' ||
          message.type === 'execution_cancelled'
        ) {
          // Invalidate executions data to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['/api/executions'] });
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    // Clean up WebSocket connection on component unmount
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [queryClient]);

  // Fetch executions from API
  const { data, isLoading, error } = useQuery<{ 
    executions: WorkflowExecution[]; 
    total: number; 
  }>({
    queryKey: ['/api/executions', page, pageSize, filters],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      
      if (filters.status) params.append('status', filters.status);
      if (filters.dateRange.from) params.append('from', filters.dateRange.from.toISOString());
      if (filters.dateRange.to) params.append('to', filters.dateRange.to.toISOString());
      if (filters.search) params.append('search', filters.search);
      
      const response = await apiRequest('GET', `/api/executions?${params.toString()}`);
      return response.json();
    }
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // Status badge renderer
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

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm:ss');
  };

  // Render loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Workflow Executions</h1>
          <p className="text-muted-foreground mb-8">
            View and manage your workflow execution history and logs
          </p>
          
          <Card>
            <CardHeader>
              <CardTitle>Loading Executions</CardTitle>
              <CardDescription>Please wait while we load your execution history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  // Render error state
  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-3xl font-bold mb-6">Workflow Executions</h1>
          
          <Card className="border-red-300">
            <CardHeader>
              <CardTitle className="text-red-600">Error Loading Executions</CardTitle>
              <CardDescription className="text-red-500">
                There was an error loading your workflow executions. Please try again later.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-500">
                {error instanceof Error ? error.message : 'Unknown error occurred'}
              </p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Workflow Executions</h1>
        <p className="text-muted-foreground mb-8">
          View and manage your workflow execution history and logs
        </p>
        
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter executions by status, date, or search by name</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-4">
              <div className="w-full md:w-1/4">
                <Select 
                  value={filters.status || 'all'}
                  onValueChange={(value) => setFilters({...filters, status: value === 'all' ? null : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value={ExecutionStatus.RUNNING}>Running</SelectItem>
                    <SelectItem value={ExecutionStatus.COMPLETED}>Completed</SelectItem>
                    <SelectItem value={ExecutionStatus.FAILED}>Failed</SelectItem>
                    <SelectItem value={ExecutionStatus.PAUSED}>Paused</SelectItem>
                    <SelectItem value={ExecutionStatus.CANCELLED}>Cancelled</SelectItem>
                    <SelectItem value={ExecutionStatus.QUEUED}>Queued</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full md:w-1/3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "MMM dd, yyyy")} -{" "}
                            {format(filters.dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "Date Range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: filters.dateRange.from || undefined,
                        to: filters.dateRange.to || undefined,
                      }}
                      onSelect={(range) => 
                        setFilters({
                          ...filters, 
                          dateRange: {
                            from: range?.from || null,
                            to: range?.to || null
                          }
                        })
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="w-full md:w-1/3 relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by workflow name..."
                  className="pl-8"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
              
              <Button 
                variant="outline" 
                className="w-full md:w-auto"
                onClick={() => setFilters({
                  status: null,
                  dateRange: { from: null, to: null },
                  search: ''
                })}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Executions Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableCaption>A list of your workflow executions</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Completed At</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Triggered By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.executions && data.executions.length > 0 ? (
                  data.executions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">{execution.id}</TableCell>
                      <TableCell>{execution.workflowName}</TableCell>
                      <TableCell>{getStatusBadge(execution.status)}</TableCell>
                      <TableCell>{formatDate(execution.startedAt)}</TableCell>
                      <TableCell>{formatDate(execution.completedAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{ width: `${execution.progress}%` }}
                            />
                          </div>
                          <span className="text-xs">{execution.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{execution.triggeredBy.username}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/executions/${execution.id}`}>
                          <Button variant="ghost" size="sm">
                            View <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6">
                      <div className="flex flex-col items-center justify-center p-4">
                        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground mb-1">No executions found</p>
                        <p className="text-xs text-muted-foreground">
                          Try changing your filters or creating a new workflow
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (page > 1) setPage(page - 1);
                      }}
                      className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <PaginationItem key={pageNum}>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(pageNum);
                          }}
                          isActive={page === pageNum}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  
                  {totalPages > 5 && (
                    <>
                      <PaginationItem>
                        <PaginationLink href="#" onClick={(e) => e.preventDefault()}>
                          ...
                        </PaginationLink>
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(totalPages);
                          }}
                          isActive={page === totalPages}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => {
                        e.preventDefault();
                        if (page < totalPages) setPage(page + 1);
                      }}
                      className={page >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}