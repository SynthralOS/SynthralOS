import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BarChart, XAxis, YAxis, Tooltip, Legend, Bar, ResponsiveContainer } from 'recharts';
import { AreaChart, Area } from 'recharts';
import { CalendarIcon } from 'lucide-react';
import { format, sub } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Types for usage data
interface UsageReport {
  period: {
    start: string;
    end: string;
  };
  summary: UsageSummary[];
  modelUsage: ModelUsage[];
}

interface UsageSummary {
  usageType: string;
  totalUsage: number;
  quota: number | null;
  percentUsed: number | null;
}

interface ModelUsage {
  model: string;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  count: number;
}

interface DateRangeProps {
  start: Date;
  end: Date;
  onRangeChange: (start: Date, end: Date) => void;
}

// Date range picker component
const DateRangePicker: React.FC<DateRangeProps> = ({ start, end, onRangeChange }) => {
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  
  return (
    <div className="flex space-x-2">
      <Popover open={isStartOpen} onOpenChange={setIsStartOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>From: {format(start, 'PP')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={start}
            onSelect={(date) => {
              if (date) {
                onRangeChange(date, end);
                setIsStartOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Popover open={isEndOpen} onOpenChange={setIsEndOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span>To: {format(end, 'PP')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={end}
            onSelect={(date) => {
              if (date) {
                onRangeChange(start, date);
                setIsEndOpen(false);
              }
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      
      <Button variant="outline" onClick={() => {
        const today = new Date();
        const monthAgo = sub(today, { months: 1 });
        onRangeChange(monthAgo, today);
      }}>
        Last 30 Days
      </Button>
      
      <Button variant="outline" onClick={() => {
        const today = new Date();
        const weekAgo = sub(today, { weeks: 1 });
        onRangeChange(weekAgo, today);
      }}>
        Last 7 Days
      </Button>
    </div>
  );
};

// Quick stats component
const QuickStats: React.FC<{ data: UsageReport | undefined }> = ({ data }) => {
  if (!data) return null;
  
  const modelUsage = data.modelUsage;
  const totalCost = modelUsage.reduce((sum, item) => sum + item.totalCost, 0);
  const totalTokens = modelUsage.reduce((sum, item) => sum + item.totalInputTokens + item.totalOutputTokens, 0);
  const totalModelCalls = modelUsage.reduce((sum, item) => sum + item.count, 0);
  
  const workflowExecutions = data.summary.find(s => s.usageType === 'workflow.executions')?.totalUsage || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Model Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${(totalCost / 100).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">For current period</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTokens.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">Input + Output</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Model Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalModelCalls}</div>
          <p className="text-xs text-muted-foreground">API requests</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Workflow Executions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{workflowExecutions}</div>
          <p className="text-xs text-muted-foreground">Total runs</p>
        </CardContent>
      </Card>
    </div>
  );
};

// Usage quotas component
const UsageQuotas: React.FC<{ data: UsageReport | undefined }> = ({ data }) => {
  if (!data) return null;
  
  // Filter only items with quotas
  const quotaItems = data.summary.filter(item => item.quota !== null);
  
  if (quotaItems.length === 0) {
    return (
      <Alert>
        <AlertTitle>No usage quotas defined</AlertTitle>
        <AlertDescription>
          No usage quotas have been set up for your account. Contact your administrator to set up quotas.
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="space-y-6">
      {quotaItems.map((item) => (
        <div key={item.usageType} className="space-y-2">
          <div className="flex justify-between">
            <div>
              <h4 className="font-medium">{formatUsageType(item.usageType)}</h4>
              <p className="text-sm text-muted-foreground">
                {item.totalUsage.toLocaleString()} / {item.quota?.toLocaleString() || 'Unlimited'}
              </p>
            </div>
            <div className="text-sm">
              {item.percentUsed !== null ? `${item.percentUsed}% used` : 'N/A'}
            </div>
          </div>
          <Progress value={item.percentUsed || 0} className="h-2" />
        </div>
      ))}
    </div>
  );
};

// Helper to format usage type strings
const formatUsageType = (type: string): string => {
  switch (type) {
    case 'model.tokens':
      return 'Model Tokens';
    case 'workflow.executions':
      return 'Workflow Executions';
    case 'api.calls':
      return 'API Calls';
    case 'ocr.pages':
      return 'OCR Pages';
    case 'scraper.requests':
      return 'Scraper Requests';
    case 'storage.bytes':
      return 'Storage (bytes)';
    default:
      return type.split('.').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
  }
};

// Model usage charts component
const ModelUsageCharts: React.FC<{ data: UsageReport | undefined }> = ({ data }) => {
  if (!data || data.modelUsage.length === 0) return (
    <Alert>
      <AlertTitle>No model usage data</AlertTitle>
      <AlertDescription>
        No AI model usage data is available for the selected period.
      </AlertDescription>
    </Alert>
  );
  
  // Prepare data for charts
  const costChartData = data.modelUsage.map(item => ({
    model: item.model,
    cost: parseFloat((item.totalCost / 100).toFixed(2)) // Convert cents to dollars
  }));
  
  const tokenChartData = data.modelUsage.map(item => ({
    model: item.model,
    input: item.totalInputTokens,
    output: item.totalOutputTokens
  }));
  
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium mb-4">Cost by Model</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costChartData}>
              <XAxis dataKey="model" />
              <YAxis tickFormatter={(value) => `$${value}`} />
              <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
              <Legend />
              <Bar dataKey="cost" fill="#8884d8" name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium mb-4">Tokens by Model</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tokenChartData}>
              <XAxis dataKey="model" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="input" fill="#8884d8" name="Input Tokens" />
              <Bar dataKey="output" fill="#82ca9d" name="Output Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Main usage dashboard component
const UsageDashboard: React.FC = () => {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    start: sub(new Date(), { months: 1 }),
    end: new Date(),
  });
  
  const { data, isLoading, error } = useQuery<UsageReport>({
    queryKey: ['/api/usage', dateRange.start.toISOString(), dateRange.end.toISOString()],
    refetchOnWindowFocus: false,
  });
  
  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };
  
  if (error) {
    toast({
      title: 'Error loading usage data',
      description: 'There was a problem fetching your usage data. Please try again later.',
      variant: 'destructive',
    });
  }
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between">
        <h2 className="text-3xl font-bold">Usage Dashboard</h2>
        <DateRangePicker 
          start={dateRange.start} 
          end={dateRange.end} 
          onRangeChange={handleDateRangeChange} 
        />
      </div>
      
      <Separator />
      
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="space-y-4">
            <Skeleton className="h-72 w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      ) : (
        <>
          <QuickStats data={data} />
          
          <Tabs defaultValue="charts">
            <TabsList className="mb-4">
              <TabsTrigger value="charts">Model Usage</TabsTrigger>
              <TabsTrigger value="quotas">Usage Quotas</TabsTrigger>
            </TabsList>
            
            <TabsContent value="charts">
              <ModelUsageCharts data={data} />
            </TabsContent>
            
            <TabsContent value="quotas">
              <Card>
                <CardHeader>
                  <CardTitle>Usage Limits</CardTitle>
                  <CardDescription>
                    Track your usage against your account quotas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UsageQuotas data={data} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default UsageDashboard;