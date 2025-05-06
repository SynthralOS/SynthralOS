import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layouts/AppLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { usageApi } from '@/lib/api/usage';

// API Response Types - Match these with the backend
interface DailyUsageData {
  date: string;
  type: string;
  value: number;
}

interface UsageByTypeData {
  type: string;
  value: number;
  percentage: number;
}

interface ModelUsageBreakdown {
  model: string;
  tokens: number;
  cost: number;
  percentage: number;
}

interface UsageHistoryData {
  daily: DailyUsageData[];
  byType: UsageByTypeData[];
  byModel: ModelUsageBreakdown[];
  totalCost: number;
  totalTokens: number;
}

// Enhanced interface for the UI data structure
interface UsageData {
  apiCalls: Array<{
    date: string;
    count: number;
  }>;
  tokenUsage: Array<{
    date: string;
    input: number;
    output: number;
  }>;
  modelUsage: Array<{
    name: string;
    value: number;
  }>;
  workflowExecutions: Array<{
    date: string;
    count: number;
  }>;
  summary: {
    apiCallsTotal: number;
    tokensTotal: number;
    workflowExecutionsTotal: number;
    totalCost: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

function UsagePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch usage history data
  const { data: historyData, isLoading, error, refetch } = useQuery<UsageHistoryData>({
    queryKey: ['/api/usage/history', period],
    queryFn: () => usageApi.getUsageHistory(period),
  });

  // Function to convert API data to UI data structure
  const transformDataForUI = (data: UsageHistoryData | undefined): UsageData | null => {
    if (!data) return null;
    
    // Process daily data
    const apiCalls: {date: string, count: number}[] = [];
    const tokenUsage: {date: string, input: number, output: number}[] = [];
    const workflowExecutions: {date: string, count: number}[] = [];
    
    // Group daily data by type and date
    const typeMap: Record<string, Record<string, number>> = {};
    data.daily.forEach((item) => {
      if (!typeMap[item.type]) {
        typeMap[item.type] = {};
      }
      typeMap[item.type][item.date] = item.value;
    });
    
    // Get unique dates across all types
    const uniqueDates = Array.from(
      new Set(data.daily.map((item) => item.date))
    ).sort();
    
    // Fill in the specialized arrays
    uniqueDates.forEach((date) => {
      // API Calls
      if (typeMap['api.calls']) {
        apiCalls.push({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: typeMap['api.calls'][date] || 0
        });
      }
      
      // Token Usage (split into input/output if available, otherwise use total)
      let input = 0;
      let output = 0;
      
      if (typeMap['model.tokens.input'] && typeMap['model.tokens.output']) {
        input = typeMap['model.tokens.input'][date] || 0;
        output = typeMap['model.tokens.output'][date] || 0;
      } else if (typeMap['model.tokens']) {
        // If we only have combined token data, estimate a 60/40 split
        input = Math.round((typeMap['model.tokens'][date] || 0) * 0.6);
        output = Math.round((typeMap['model.tokens'][date] || 0) * 0.4);
      }
      
      tokenUsage.push({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        input,
        output
      });
      
      // Workflow Executions
      if (typeMap['workflow.executions']) {
        workflowExecutions.push({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: typeMap['workflow.executions'][date] || 0
        });
      }
    });
    
    // Model usage for pie chart
    const modelUsage = data.byModel.map((model) => ({
      name: model.model,
      value: model.percentage
    }));
    
    // Calculate summary totals
    const apiCallsTotal = data.byType.find((item) => item.type === 'api.calls')?.value || 0;
    const tokensTotal = data.totalTokens;
    const workflowExecutionsTotal = data.byType.find((item) => item.type === 'workflow.executions')?.value || 0;
    
    return {
      apiCalls,
      tokenUsage,
      modelUsage,
      workflowExecutions,
      summary: {
        apiCallsTotal,
        tokensTotal,
        workflowExecutionsTotal,
        totalCost: data.totalCost
      }
    };
  };
  
  // Transform raw API data to UI structure
  const usageData = transformDataForUI(historyData);
  
  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Usage data refreshed",
        description: "The usage data has been updated.",
      });
    } catch (err) {
      toast({
        title: "Failed to refresh data",
        description: "Could not update usage data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Handle period change
  const handlePeriodChange = (newPeriod: '7d' | '30d' | '90d') => {
    setPeriod(newPeriod);
  };

  // Handle error display
  if (error) {
    toast({
      title: "Error loading usage data",
      description: "Failed to load usage analytics. Please try again later.",
      variant: "destructive"
    });
  }

  return (
    <AppLayout title="Usage Analytics">
      <Helmet>
        <title>Usage Analytics - SynthralOS</title>
      </Helmet>

      <div className="container max-w-7xl py-8">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Usage Analytics</h1>
              <p className="text-muted-foreground mt-1">
                Monitor your platform usage and resource consumption
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md border overflow-hidden">
                <Button 
                  variant={period === '7d' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => handlePeriodChange('7d')}
                  className="rounded-none"
                >
                  7 days
                </Button>
                <Button 
                  variant={period === '30d' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => handlePeriodChange('30d')}
                  className="rounded-none"
                >
                  30 days
                </Button>
                <Button 
                  variant={period === '90d' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => handlePeriodChange('90d')}
                  className="rounded-none"
                >
                  90 days
                </Button>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Summary Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">API Calls</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="animate-pulse">--</div>
                  ) : usageData ? (
                    usageData.apiCalls.reduce((sum: number, item: {date: string, count: number}) => sum + item.count, 0).toLocaleString()
                  ) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="animate-pulse">--</div>
                  ) : usageData ? (
                    `${(usageData.tokenUsage.reduce((sum: number, item: {date: string, input: number, output: number}) => sum + item.input + item.output, 0) / 1000).toFixed(1)}K`
                  ) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Tokens used in {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Workflow Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="animate-pulse">--</div>
                  ) : usageData ? (
                    usageData.workflowExecutions.reduce((sum: number, item: {date: string, count: number}) => sum + item.count, 0).toLocaleString()
                  ) : '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Workflows run in {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="api">API Usage</TabsTrigger>
              <TabsTrigger value="tokens">Token Usage</TabsTrigger>
              <TabsTrigger value="models">Model Distribution</TabsTrigger>
              <TabsTrigger value="workflows">Workflow Executions</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>API Calls</CardTitle>
                    <CardDescription>Daily API usage over the {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : !usageData ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={usageData.apiCalls}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#8884d8" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Token Usage</CardTitle>
                    <CardDescription>Input and output tokens used over the {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days'}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                      ) : !usageData ? (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                          No data available
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={usageData.tokenUsage}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="input" fill="#8884d8" name="Input Tokens" />
                            <Bar dataKey="output" fill="#82ca9d" name="Output Tokens" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="api">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage Details</CardTitle>
                  <CardDescription>Daily API usage trends over the {period === '7d' ? 'last 7 days' : period === '30d' ? 'last 30 days' : 'last 90 days'}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !usageData ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={usageData.apiCalls}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8" name="API Calls" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tokens">
              <Card>
                <CardHeader>
                  <CardTitle>Token Usage Details</CardTitle>
                  <CardDescription>Input and output token usage by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !usageData ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={usageData.tokenUsage}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="input" fill="#8884d8" name="Input Tokens" />
                          <Bar dataKey="output" fill="#82ca9d" name="Output Tokens" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="models">
              <Card>
                <CardHeader>
                  <CardTitle>Model Usage Distribution</CardTitle>
                  <CardDescription>Percentage of usage by AI model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 flex items-center justify-center">
                    {isLoading ? (
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    ) : !usageData || usageData.modelUsage.length === 0 ? (
                      <div className="text-muted-foreground">No model usage data available</div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={usageData.modelUsage}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {usageData.modelUsage.map((entry: {name: string, value: number}, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `${value}%`} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="workflows">
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Execution Details</CardTitle>
                  <CardDescription>Daily workflow execution count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96">
                    {isLoading ? (
                      <div className="h-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : !usageData ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={usageData.workflowExecutions}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#82ca9d" name="Workflow Executions" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}

export default UsagePage;