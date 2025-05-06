import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  ChevronRight, 
  Database, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  Check, 
  Play, 
  Clock, 
  AlertTriangle
} from 'lucide-react';

interface AirbyteSource {
  id: number;
  userId: number;
  sourceId: string;
  sourceDefinitionId: string;
  name: string;
  connectionConfiguration: Record<string, any>;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface AirbyteDestination {
  id: number;
  userId: number;
  destinationId: string;
  destinationDefinitionId: string;
  name: string;
  connectionConfiguration: Record<string, any>;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

interface AirbyteConnection {
  id: number;
  userId: number;
  connectionId: string;
  sourceId: number;
  destinationId: number;
  name: string;
  syncCatalog: any;
  status: 'active' | 'inactive' | 'deprecated';
  createdAt: string;
  updatedAt: string;
}

interface AirbyteSyncJob {
  id: number;
  connectionId: number;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  startTime: string | null;
  endTime: string | null;
  bytesSynced: number | null;
  recordsSynced: number | null;
}

export default function AirbyteIntegrationPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [configInput, setConfigInput] = useState('');
  const [connectionTestStatus, setConnectionTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');

  // Fetch Airbyte sources
  const { 
    data: sources = [], 
    isLoading: sourcesLoading 
  } = useQuery<AirbyteSource[]>({
    queryKey: ['/api/integrations/airbyte/sources'],
    retry: false,
    enabled: activeTab === 'sources' || activeTab === 'overview',
  });

  // Fetch Airbyte destinations
  const { 
    data: destinations = [], 
    isLoading: destinationsLoading 
  } = useQuery<AirbyteDestination[]>({
    queryKey: ['/api/integrations/airbyte/destinations'],
    retry: false,
    enabled: activeTab === 'destinations' || activeTab === 'overview',
  });

  // Fetch Airbyte connections
  const { 
    data: connections = [], 
    isLoading: connectionsLoading 
  } = useQuery<AirbyteConnection[]>({
    queryKey: ['/api/integrations/airbyte/connections'],
    retry: false,
    enabled: activeTab === 'connections' || activeTab === 'overview',
  });

  // Fetch Airbyte sync jobs
  const { 
    data: syncJobs = [], 
    isLoading: syncJobsLoading 
  } = useQuery<AirbyteSyncJob[]>({
    queryKey: ['/api/integrations/airbyte/sync-jobs'],
    retry: false,
    enabled: activeTab === 'jobs' || activeTab === 'overview',
  });

  // Test Airbyte connection mutation
  const testConnection = useMutation({
    mutationFn: async (config: string) => {
      setConnectionTestStatus('testing');
      return apiRequest('POST', '/api/integrations/airbyte/test-connection', { config: JSON.parse(config) });
    },
    onSuccess: () => {
      setConnectionTestStatus('success');
      toast({
        title: 'Connection successful',
        description: 'Successfully connected to Airbyte API',
      });
    },
    onError: (error: any) => {
      setConnectionTestStatus('failed');
      toast({
        title: 'Connection failed',
        description: error.message || 'Failed to connect to Airbyte API',
        variant: 'destructive',
      });
    },
  });

  // Save Airbyte configuration mutation
  const saveConfig = useMutation({
    mutationFn: async (config: string) => {
      return apiRequest('POST', '/api/integrations/airbyte/save-config', { config: JSON.parse(config) });
    },
    onSuccess: () => {
      toast({
        title: 'Configuration saved',
        description: 'Airbyte configuration has been saved successfully',
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/airbyte/sources'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/airbyte/destinations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/airbyte/connections'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'Failed to save Airbyte configuration',
        variant: 'destructive',
      });
    },
  });

  // Trigger sync mutation
  const triggerSync = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest('POST', `/api/integrations/airbyte/trigger-sync/${connectionId}`);
    },
    onSuccess: () => {
      toast({
        title: 'Sync triggered',
        description: 'Data synchronization has been started',
      });
      // Invalidate sync jobs query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/integrations/airbyte/sync-jobs'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Sync failed',
        description: error.message || 'Failed to trigger synchronization',
        variant: 'destructive',
      });
    },
  });

  function renderOverviewTab() {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="mr-2 h-5 w-5" />
                Sources
              </CardTitle>
              <CardDescription>Data source connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{sources.length}</div>
              <p className="text-sm text-muted-foreground">Configured data sources</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="#sources" onClick={() => setActiveTab('sources')}>
                  View Sources <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Layers className="mr-2 h-5 w-5" />
                Destinations
              </CardTitle>
              <CardDescription>Data destination targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{destinations.length}</div>
              <p className="text-sm text-muted-foreground">Configured destinations</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="#destinations" onClick={() => setActiveTab('destinations')}>
                  View Destinations <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ArrowRight className="mr-2 h-5 w-5" />
                Connections
              </CardTitle>
              <CardDescription>Active data pipelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{connections.length}</div>
              <p className="text-sm text-muted-foreground">Data flow connections</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href="#connections" onClick={() => setActiveTab('connections')}>
                  View Connections <ChevronRight className="ml-auto h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>

        <h3 className="text-lg font-medium mt-6">Recent Synchronizations</h3>
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium">Connection</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Started</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Duration</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Records</th>
                </tr>
              </thead>
              <tbody>
                {syncJobsLoading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center">Loading...</td>
                  </tr>
                ) : syncJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center">No sync jobs found</td>
                  </tr>
                ) : (
                  syncJobs.slice(0, 5).map((job) => {
                    const connection = connections.find(c => c.id === job.connectionId);
                    const source = connection 
                      ? sources.find(s => s.id === connection.sourceId)?.name || 'Unknown'
                      : 'Unknown';
                    const destination = connection
                      ? destinations.find(d => d.id === connection.destinationId)?.name || 'Unknown'
                      : 'Unknown';
                    
                    const startTime = job.startTime ? new Date(job.startTime) : null;
                    const endTime = job.endTime ? new Date(job.endTime) : null;
                    
                    const duration = (startTime && endTime) 
                      ? ((endTime.getTime() - startTime.getTime()) / 1000).toFixed(1) + 's'
                      : job.status === 'running' 
                        ? 'Running...' 
                        : '-';
                    
                    return (
                      <tr key={job.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">{source} → {destination}</td>
                        <td className="p-4 align-middle">
                          <Badge 
                            variant={
                              job.status === 'succeeded' ? 'default' :
                              job.status === 'running' ? 'outline' :
                              job.status === 'failed' ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {job.status}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {startTime ? startTime.toLocaleString() : '-'}
                        </td>
                        <td className="p-4 align-middle">{duration}</td>
                        <td className="p-4 align-middle">{job.recordsSynced || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href="#jobs" onClick={() => setActiveTab('jobs')}>
              View All Jobs <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  function renderConnectionsTab() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <h3 className="text-lg font-medium">Data Connections</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Connection
          </Button>
        </div>
        
        {connectionsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        ) : connections.length === 0 ? (
          <Alert>
            <AlertTitle>No connections found</AlertTitle>
            <AlertDescription>
              You haven't created any connections between sources and destinations yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4">
            {connections.map((connection) => {
              const source = sources.find(s => s.id === connection.sourceId);
              const destination = destinations.find(d => d.id === connection.destinationId);
              
              return (
                <Card key={connection.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{connection.name}</CardTitle>
                      <Badge variant={connection.status === 'active' ? 'default' : 'secondary'}>
                        {connection.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {source?.name || 'Unknown source'} → {destination?.name || 'Unknown destination'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Source</p>
                          <p className="truncate">{source?.name || 'Unknown'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-xs text-muted-foreground mb-1">Destination</p>
                          <p className="truncate">{destination?.name || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => triggerSync.mutate(connection.id)}
                      disabled={triggerSync.isPending}
                    >
                      {triggerSync.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Sync Now
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderSourcesTab() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <h3 className="text-lg font-medium">Data Sources</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Source
          </Button>
        </div>
        
        {sourcesLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        ) : sources.length === 0 ? (
          <Alert>
            <AlertTitle>No sources found</AlertTitle>
            <AlertDescription>
              You haven't configured any data sources yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader>
                  <CardTitle className="text-base">{source.name}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    ID: {source.sourceId}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">Type: </span>
                      <span>{source.sourceDefinitionId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">Workspace: </span>
                      <span className="truncate">{source.workspaceId}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderDestinationsTab() {
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <h3 className="text-lg font-medium">Data Destinations</h3>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Destination
          </Button>
        </div>
        
        {destinationsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        ) : destinations.length === 0 ? (
          <Alert>
            <AlertTitle>No destinations found</AlertTitle>
            <AlertDescription>
              You haven't configured any data destinations yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {destinations.map((destination) => (
              <Card key={destination.id}>
                <CardHeader>
                  <CardTitle className="text-base">{destination.name}</CardTitle>
                  <CardDescription className="text-xs truncate">
                    ID: {destination.destinationId}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">Type: </span>
                      <span>{destination.destinationDefinitionId}</span>
                    </div>
                    <div>
                      <span className="font-medium text-xs text-muted-foreground">Workspace: </span>
                      <span className="truncate">{destination.workspaceId}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderJobsTab() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Synchronization Jobs</h3>
        
        {syncJobsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        ) : syncJobs.length === 0 ? (
          <Alert>
            <AlertTitle>No sync jobs found</AlertTitle>
            <AlertDescription>
              You haven't run any synchronization jobs yet.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead>
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium">ID</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Connection</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Status</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Started</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Ended</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Records</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Bytes</th>
                  </tr>
                </thead>
                <tbody>
                  {syncJobs.map((job) => {
                    const connection = connections.find(c => c.id === job.connectionId);
                    const source = connection 
                      ? sources.find(s => s.id === connection.sourceId)?.name || 'Unknown'
                      : 'Unknown';
                    const destination = connection
                      ? destinations.find(d => d.id === connection.destinationId)?.name || 'Unknown'
                      : 'Unknown';
                    
                    return (
                      <tr key={job.id} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">{job.id}</td>
                        <td className="p-4 align-middle">{source} → {destination}</td>
                        <td className="p-4 align-middle">
                          <div className="flex items-center">
                            {job.status === 'running' && <Clock className="mr-1.5 h-3.5 w-3.5 text-blue-500" />}
                            {job.status === 'succeeded' && <Check className="mr-1.5 h-3.5 w-3.5 text-green-500" />}
                            {job.status === 'failed' && <AlertTriangle className="mr-1.5 h-3.5 w-3.5 text-red-500" />}
                            <Badge 
                              variant={
                                job.status === 'succeeded' ? 'default' :
                                job.status === 'running' ? 'outline' :
                                job.status === 'failed' ? 'destructive' : 
                                'secondary'
                              }
                            >
                              {job.status}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-4 align-middle">
                          {job.startTime ? new Date(job.startTime).toLocaleString() : '-'}
                        </td>
                        <td className="p-4 align-middle">
                          {job.endTime ? new Date(job.endTime).toLocaleString() : '-'}
                        </td>
                        <td className="p-4 align-middle">
                          {job.recordsSynced?.toLocaleString() || '-'}
                        </td>
                        <td className="p-4 align-middle">
                          {job.bytesSynced 
                            ? (job.bytesSynced > 1024 * 1024 
                                ? (job.bytesSynced / (1024 * 1024)).toFixed(2) + ' MB' 
                                : (job.bytesSynced / 1024).toFixed(2) + ' KB')
                            : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSettingsTab() {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Airbyte Settings</h3>
        
        <Card>
          <CardHeader>
            <CardTitle>Connection Configuration</CardTitle>
            <CardDescription>
              Configure your Airbyte connection settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="config">Configuration JSON</Label>
                <div className="mt-1.5">
                  <textarea
                    id="config"
                    rows={10}
                    className="w-full p-2 text-sm font-mono rounded-md border border-input bg-transparent"
                    value={configInput}
                    onChange={(e) => setConfigInput(e.target.value)}
                    placeholder={`{
  "apiUrl": "https://your-airbyte-instance-url/api",
  "apiKey": "your-airbyte-api-key",
  "workspaceId": "your-workspace-id"
}`}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Enter your Airbyte configuration as a JSON object
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                try {
                  // Just validate JSON format
                  JSON.parse(configInput);
                  testConnection.mutate(configInput);
                } catch (error) {
                  toast({
                    title: 'Invalid JSON',
                    description: 'Please enter valid JSON configuration',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={testConnection.isPending || !configInput.trim()}
            >
              {connectionTestStatus === 'testing' ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : connectionTestStatus === 'success' ? (
                <>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Test Successful
                </>
              ) : connectionTestStatus === 'failed' ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4 text-red-500" />
                  Test Failed
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button
              onClick={() => {
                try {
                  // Validate JSON format
                  JSON.parse(configInput);
                  saveConfig.mutate(configInput);
                } catch (error) {
                  toast({
                    title: 'Invalid JSON',
                    description: 'Please enter valid JSON configuration',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={saveConfig.isPending || !configInput.trim()}
            >
              {saveConfig.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <AppLayout title="Airbyte Integration">
      <div className="p-6 h-full overflow-auto">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Airbyte Integration</h1>
              <p className="text-muted-foreground">
                Manage data synchronization with Airbyte ETL platform
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button asChild>
                <Link href="/integrations">
                  Back to Integrations
                </Link>
              </Button>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sources">Sources</TabsTrigger>
              <TabsTrigger value="destinations">Destinations</TabsTrigger>
              <TabsTrigger value="connections">Connections</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <div className="mt-6">
              <TabsContent value="overview" className="m-0">
                {renderOverviewTab()}
              </TabsContent>
              <TabsContent value="sources" className="m-0">
                {renderSourcesTab()}
              </TabsContent>
              <TabsContent value="destinations" className="m-0">
                {renderDestinationsTab()}
              </TabsContent>
              <TabsContent value="connections" className="m-0">
                {renderConnectionsTab()}
              </TabsContent>
              <TabsContent value="jobs" className="m-0">
                {renderJobsTab()}
              </TabsContent>
              <TabsContent value="settings" className="m-0">
                {renderSettingsTab()}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}