import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '../layouts/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

type SocialMonitor = {
  id: string;
  name: string;
  description?: string;
  platforms: string[];
  keywords: string[];
  accounts?: string[];
  frequency: number;
  alertThreshold?: number;
  isActive: boolean;
  createdAt: string;
  lastRunAt?: string;
};

type SocialAlert = {
  id: string;
  platform: string;
  content: string;
  url: string;
  timestamp: string;
  keywords: string[];
  score: number;
  isRead: boolean;
  metadata: Record<string, any>;
};

export default function SocialMonitoring() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch social monitors
  const { 
    data: monitors,
    isLoading,
    error
  } = useQuery<SocialMonitor[]>({
    queryKey: ['/api/social-monitors'],
    retry: false
  });

  // Create demo monitors
  const createDemoMonitors = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/social-monitors/demo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/social-monitors'] });
      toast({
        title: 'Demo monitors created',
        description: 'Sample social media monitors have been added to your account.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating demo monitors',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Run a monitor
  const runMonitor = useMutation({
    mutationFn: async (monitorId: string) => {
      const response = await apiRequest('POST', `/api/social-monitors/${monitorId}/run`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Monitor run completed',
        description: `Detected ${data.postCount} posts and ${data.mentionCount} mentions.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error running monitor',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96 text-center gap-4">
          <h2 className="text-2xl font-bold">Failed to load social monitors</h2>
          <p className="text-muted-foreground">There was an error loading your social media monitors.</p>
          <Button
            onClick={() => createDemoMonitors.mutate()}
            disabled={createDemoMonitors.isPending}
          >
            {createDemoMonitors.isPending ? 'Creating...' : 'Create Demo Monitors'}
          </Button>
        </div>
      </AppLayout>
    );
  }

  if (!monitors || (Array.isArray(monitors) && monitors.length === 0)) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Social Monitoring</h1>
            <Button
              onClick={() => setLocation('/social-monitoring/new')}
            >
              Create New Monitor
            </Button>
          </div>
          
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No social monitors found</CardTitle>
              <CardDescription>
                You haven't created any social media monitors yet. First, set up your social connectors, then create a monitor to track mentions, keywords, and sentiment across social platforms.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={() => setLocation('/social-connectors')}>
                Set Up Connectors
              </Button>
              <Button variant="outline" onClick={() => createDemoMonitors.mutate()}>
                Create Demo Monitors
              </Button>
              <Button onClick={() => setLocation('/social-monitoring/new')}>
                Create New Monitor
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Social Monitoring</h1>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => setLocation('/social-connectors')}
            >
              Manage Connectors
            </Button>
            <Button
              variant="outline"
              onClick={() => createDemoMonitors.mutate()}
              disabled={createDemoMonitors.isPending}
            >
              {createDemoMonitors.isPending ? 'Creating...' : 'Create Demo Monitors'}
            </Button>
            <Button
              onClick={() => setLocation('/social-monitoring/new')}
            >
              Create New Monitor
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.isArray(monitors) && monitors.map((monitor: SocialMonitor) => (
            <Card key={monitor.id} className="overflow-hidden">
              <CardHeader className="bg-muted/40">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{monitor.name}</CardTitle>
                    <CardDescription>{monitor.description}</CardDescription>
                  </div>
                  <Badge variant={monitor.isActive ? "default" : "outline"}>
                    {monitor.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Platforms</div>
                  <div className="flex flex-wrap gap-2">
                    {monitor.platforms.map(platform => (
                      <Badge key={platform} variant="secondary">{platform}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="text-sm font-semibold mb-2">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {monitor.keywords.map(keyword => (
                      <Badge key={keyword} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm text-muted-foreground">
                  <div>Check frequency: {monitor.frequency} minutes</div>
                  <div>
                    {monitor.lastRunAt ? `Last run: ${new Date(monitor.lastRunAt).toLocaleString()}` : 'Never run'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 flex justify-between">
                <Button variant="outline" onClick={() => setLocation(`/social-monitoring/${monitor.id}`)}>
                  View Details
                </Button>
                <Button 
                  onClick={() => runMonitor.mutate(monitor.id)}
                  disabled={runMonitor.isPending}
                >
                  {runMonitor.isPending ? 'Running...' : 'Run Now'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}