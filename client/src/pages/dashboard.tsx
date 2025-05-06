import React from 'react';
import { Link } from 'wouter';
import { AppLayout } from '@/layouts/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkflows, Workflow } from '@/lib/workflow';
import { CalendarClock, Edit2, Play, Trash2 } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  
  // Fetch workflows
  const { data: workflows, isLoading, error } = useQuery<Workflow[]>({
    queryKey: ['/api/workflows'],
    queryFn: fetchWorkflows,
    // Try to fetch workflows, but don't show an error if not logged in
    retry: false
  });

  return (
    <AppLayout title="Dashboard">
      <div className="p-6 h-full overflow-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || user?.username || 'User'}!</h1>
          <p className="text-slate-500 dark:text-slate-400">
            This is your SynthralOS dashboard. Get started by creating a new workflow or exploring templates.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Create New Workflow</CardTitle>
              <CardDescription>Build a custom workflow from scratch</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/builder">
                <Button className="w-full">Create Workflow</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Browse Templates</CardTitle>
              <CardDescription>Explore pre-built workflow templates</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/templates">
                <Button variant="outline" className="w-full">View Templates</Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Manage Integrations</CardTitle>
              <CardDescription>Connect external services and APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/integrations">
                <Button variant="outline" className="w-full">Setup Integrations</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        
        {/* Memory & RAG Tools */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Memory & RAG Tools</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Memory Dashboard</CardTitle>
                <CardDescription>Explore and search agent memory systems</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai/memory-dashboard">
                  <Button variant="outline" className="w-full">Open Dashboard</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">RAG DB Switch</CardTitle>
                <CardDescription>Dynamic RAG system selection and testing</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai/rag-db-switch">
                  <Button variant="outline" className="w-full">Open RAG Tool</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Runtime Dashboard</CardTitle>
                <CardDescription>Monitor and manage runtime environments</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai/runtime-dashboard">
                  <Button variant="outline" className="w-full">Open Runtime</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Agent Protocols</CardTitle>
                <CardDescription>Configure and manage agent protocols</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/ai/agent-protocols">
                  <Button variant="outline" className="w-full">Open Protocols</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Your Workflows */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Your Workflows</h2>
            <Link href="/builder">
              <Button variant="outline" size="sm">
                Create New
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : error ? (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <p>Failed to load workflows.</p>
                  <p className="text-sm mt-1">Please try again or log in if you're not authenticated.</p>
                </div>
              </CardContent>
            </Card>
          ) : workflows && workflows.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workflows.map((workflow: Workflow) => (
                <Card key={workflow.id} className="border border-slate-200 dark:border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {workflow.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 space-x-2">
                      <CalendarClock className="h-4 w-4" />
                      <span>Updated {new Date(workflow.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/builder/${workflow.id}`}>
                          <Edit2 className="h-4 w-4 mr-1" /> Edit
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-1" /> Run
                      </Button>
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border border-slate-200 dark:border-slate-700">
              <CardContent className="p-8">
                <div className="text-center text-slate-500 dark:text-slate-400">
                  <p className="mb-4">You don't have any workflows yet.</p>
                  <Link href="/builder">
                    <Button>Create Your First Workflow</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Statistics and Recent Activities */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stats */}
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Platform Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Active Workflows</p>
                  <p className="text-2xl font-bold">{workflows?.length || 0}</p>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Workflow Executions</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Connected APIs</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
                <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400">AI Model Calls</p>
                  <p className="text-2xl font-bold">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Recent Activity */}
          <Card className="border border-slate-200 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="text-sm font-medium">Account created</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Just now</p>
                  </div>
                </div>
                <div className="flex items-center justify-center p-8">
                  <p className="text-slate-400 dark:text-slate-500 text-sm">
                    Your activity will appear here as you use the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}