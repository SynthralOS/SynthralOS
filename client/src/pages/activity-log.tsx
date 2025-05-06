import { useState, useEffect } from 'react';
import { AppLayout } from '@/layouts/AppLayout';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Filter, 
  Search, 
  Shield, 
  User, 
  Clock, 
  AlertTriangle, 
  Check, 
  Lock, 
  Zap, 
  FileText,
  Download
} from 'lucide-react';

// Types
interface BaseActivityItem {
  id: number;
  timestamp: string;
  type: string;
  userId?: number;
  username?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  status?: string;
  details?: string;
  metadata?: Record<string, any>;
}

interface SystemActivityItem extends BaseActivityItem {
  type: 'SYSTEM';
  component: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

interface UserActivityItem extends BaseActivityItem {
  type: 'USER';
  userId: number;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
}

interface SecurityActivityItem extends BaseActivityItem {
  type: 'SECURITY';
  userId?: number;
  username?: string;
  action: string;
  outcome: 'success' | 'failure' | 'blocked';
  severity: 'low' | 'medium' | 'high' | 'critical';
  reason?: string;
}

interface WorkflowActivityItem extends BaseActivityItem {
  type: 'WORKFLOW';
  workflowId: number;
  workflowName: string;
  executionId: number;
  status: 'started' | 'completed' | 'failed' | 'cancelled';
  nodeId?: string;
  duration?: number;
}

interface APIActivityItem extends BaseActivityItem {
  type: 'API';
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  userId?: number;
  username?: string;
  ipAddress?: string;
}

interface GuardrailActivityItem extends BaseActivityItem {
  type: 'GUARDRAIL';
  category: 'routing' | 'similarity' | 'security' | 'transformation' | 'retry';
  action: string;
  prompt?: string;
  outcome: 'allowed' | 'modified' | 'blocked';
  reason?: string;
}

type ActivityItem = 
  | SystemActivityItem 
  | UserActivityItem 
  | SecurityActivityItem 
  | WorkflowActivityItem 
  | APIActivityItem
  | GuardrailActivityItem;

// Filters
interface ActivityFilters {
  type: string[];
  startDate: string | null;
  endDate: string | null;
  userId: string | null;
  searchQuery: string;
}

export default function ActivityLog() {
  // State
  const [filters, setFilters] = useState<ActivityFilters>({
    type: [],
    startDate: null,
    endDate: null,
    userId: null,
    searchQuery: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Fetch activity logs
  const { 
    data: activityLogs,
    isLoading,
    error
  } = useQuery<ActivityItem[]>({
    queryKey: ['/api/activity-log', filters, page, pageSize],
    retry: false,
    enabled: true,
  });

  // Apply filter
  const toggleTypeFilter = (type: string) => {
    if (filters.type.includes(type)) {
      setFilters({
        ...filters,
        type: filters.type.filter(t => t !== type)
      });
    } else {
      setFilters({
        ...filters,
        type: [...filters.type, type]
      });
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      type: [],
      startDate: null,
      endDate: null,
      userId: null,
      searchQuery: ''
    });
  };

  // Update search query
  const updateSearchQuery = (query: string) => {
    setFilters({
      ...filters,
      searchQuery: query
    });
  };

  // Filter logs based on selected filters
  const filteredLogs = activityLogs;

  return (
    <AppLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Activity Log</h1>
            <p className="text-muted-foreground">
              Comprehensive audit trail of all system activities
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {showFilters && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle>Filter Activity</CardTitle>
              <CardDescription>
                Refine activity logs by applying multiple filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant={filters.type.includes('SYSTEM') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('SYSTEM')}
                    >
                      System
                    </Badge>
                    <Badge 
                      variant={filters.type.includes('USER') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('USER')}
                    >
                      User
                    </Badge>
                    <Badge 
                      variant={filters.type.includes('SECURITY') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('SECURITY')}
                    >
                      Security
                    </Badge>
                    <Badge 
                      variant={filters.type.includes('WORKFLOW') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('WORKFLOW')}
                    >
                      Workflow
                    </Badge>
                    <Badge 
                      variant={filters.type.includes('API') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('API')}
                    >
                      API
                    </Badge>
                    <Badge 
                      variant={filters.type.includes('GUARDRAIL') ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleTypeFilter('GUARDRAIL')}
                    >
                      Guardrail
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input 
                      type="date" 
                      value={filters.startDate || ''} 
                      onChange={(e) => setFilters({...filters, startDate: e.target.value || null})}
                    />
                    <Input 
                      type="date" 
                      value={filters.endDate || ''} 
                      onChange={(e) => setFilters({...filters, endDate: e.target.value || null})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>User ID</Label>
                  <Input 
                    placeholder="Filter by user ID"
                    value={filters.userId || ''} 
                    onChange={(e) => setFilters({...filters, userId: e.target.value || null})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      className="pl-8"
                      value={filters.searchQuery}
                      onChange={(e) => updateSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={clearFilters}>Clear Filters</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="all">
          <TabsList className="mb-6">
            <TabsTrigger value="all">All Activities</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
            <TabsTrigger value="user">User</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="workflow">Workflows</TabsTrigger>
            <TabsTrigger value="api">API</TabsTrigger>
            <TabsTrigger value="guardrail">Guardrails</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ActivityLogTable logs={filteredLogs} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="system">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'SYSTEM')} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="user">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'USER')} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="security">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'SECURITY')} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="workflow">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'WORKFLOW')} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="api">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'API')} 
              isLoading={isLoading} 
            />
          </TabsContent>

          <TabsContent value="guardrail">
            <ActivityLogTable 
              logs={filteredLogs?.filter(log => log.type === 'GUARDRAIL')} 
              isLoading={isLoading} 
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6">
          <div className="flex items-center space-x-2">
            <Label>Page Size:</Label>
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page}
            </span>
            <Button 
              variant="outline" 
              onClick={() => setPage(p => p + 1)}
              disabled={!filteredLogs || filteredLogs.length < pageSize}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

interface ActivityLogTableProps {
  logs: ActivityItem[] | undefined;
  isLoading: boolean;
}

function ActivityLogTable({ logs, isLoading }: ActivityLogTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Activity Logs Found</h3>
        <p className="text-muted-foreground mb-4">
          There are no activity logs matching your criteria.
        </p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Timestamp</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead className="w-[120px]">User</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-mono text-xs">
                {new Date(log.timestamp).toLocaleString()}
              </TableCell>
              <TableCell>
                {getActivityTypeBadge(log.type)}
              </TableCell>
              <TableCell>
                <div>
                  {renderActivityDetails(log)}
                </div>
              </TableCell>
              <TableCell>
                {log.userId ? (
                  <div className="flex items-center space-x-1">
                    <User className="h-3 w-3" />
                    <span className="text-sm">{log.username || log.userId}</span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">System</span>
                )}
              </TableCell>
              <TableCell>
                {getActivityStatusBadge(log)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Helper functions for rendering different activity types
function getActivityTypeBadge(type: string) {
  switch (type) {
    case 'SYSTEM':
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">System</Badge>;
    case 'USER':
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">User</Badge>;
    case 'SECURITY':
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Security</Badge>;
    case 'WORKFLOW':
      return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Workflow</Badge>;
    case 'API':
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">API</Badge>;
    case 'GUARDRAIL':
      return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">Guardrail</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
}

function getActivityStatusBadge(log: ActivityItem) {
  // For system logs
  if (log.type === 'SYSTEM') {
    const systemLog = log as SystemActivityItem;
    switch (systemLog.level) {
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Info</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Warning</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // For security logs
  if (log.type === 'SECURITY') {
    const securityLog = log as SecurityActivityItem;
    switch (securityLog.outcome) {
      case 'success':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Success</Badge>;
      case 'failure':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failure</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Blocked</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // For workflow logs
  if (log.type === 'WORKFLOW') {
    const workflowLog = log as WorkflowActivityItem;
    switch (workflowLog.status) {
      case 'started':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Started</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // For API logs
  if (log.type === 'API') {
    const apiLog = log as APIActivityItem;
    if (apiLog.statusCode >= 200 && apiLog.statusCode < 300) {
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{apiLog.statusCode}</Badge>;
    } else if (apiLog.statusCode >= 400 && apiLog.statusCode < 500) {
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">{apiLog.statusCode}</Badge>;
    } else if (apiLog.statusCode >= 500) {
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{apiLog.statusCode}</Badge>;
    } else {
      return <Badge variant="outline">{apiLog.statusCode}</Badge>;
    }
  }

  // For guardrail logs
  if (log.type === 'GUARDRAIL') {
    const guardrailLog = log as GuardrailActivityItem;
    switch (guardrailLog.outcome) {
      case 'allowed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Allowed</Badge>;
      case 'modified':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Modified</Badge>;
      case 'blocked':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Blocked</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  }

  // Default
  return <Badge variant="outline">Unknown</Badge>;
}

function renderActivityDetails(log: ActivityItem) {
  switch (log.type) {
    case 'SYSTEM':
      const systemLog = log as SystemActivityItem;
      return (
        <div>
          <div className="font-medium">{systemLog.message}</div>
          <div className="text-xs text-muted-foreground">{systemLog.component}</div>
        </div>
      );
    
    case 'USER':
      const userLog = log as UserActivityItem;
      return (
        <div>
          <div className="font-medium">{userLog.action}</div>
          <div className="text-xs text-muted-foreground">
            {userLog.resource} {userLog.resourceId ? `#${userLog.resourceId}` : ''}
          </div>
        </div>
      );
    
    case 'SECURITY':
      const securityLog = log as SecurityActivityItem;
      return (
        <div>
          <div className="font-medium">{securityLog.action}</div>
          {securityLog.reason && (
            <div className="text-xs text-muted-foreground">{securityLog.reason}</div>
          )}
        </div>
      );
    
    case 'WORKFLOW':
      const workflowLog = log as WorkflowActivityItem;
      return (
        <div>
          <div className="font-medium">{workflowLog.workflowName}</div>
          <div className="text-xs text-muted-foreground">
            Execution #{workflowLog.executionId}
            {workflowLog.nodeId && ` • Node: ${workflowLog.nodeId}`}
            {workflowLog.duration && ` • Duration: ${formatDuration(workflowLog.duration)}`}
          </div>
        </div>
      );
    
    case 'API':
      const apiLog = log as APIActivityItem;
      return (
        <div>
          <div className="font-medium">
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-800 mr-1.5">
              {apiLog.method}
            </span>
            {apiLog.endpoint}
          </div>
          <div className="text-xs text-muted-foreground">
            Duration: {formatDuration(apiLog.duration)}
            {apiLog.ipAddress && ` • IP: ${apiLog.ipAddress}`}
          </div>
        </div>
      );
    
    case 'GUARDRAIL':
      const guardrailLog = log as GuardrailActivityItem;
      return (
        <div>
          <div className="font-medium">{guardrailLog.action}</div>
          <div className="text-xs text-muted-foreground">
            {guardrailLog.category}
            {guardrailLog.reason && ` • ${guardrailLog.reason}`}
          </div>
          {guardrailLog.prompt && (
            <div className="mt-1 text-xs italic truncate max-w-md">
              "{guardrailLog.prompt}"
            </div>
          )}
        </div>
      );
    
    default:
      return <div>{log.details || 'No details available'}</div>;
  }
}

// Format duration in milliseconds to a readable string
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}